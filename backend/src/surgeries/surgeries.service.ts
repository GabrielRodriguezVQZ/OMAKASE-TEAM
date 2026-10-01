import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surgery, SurgeryStatus, SurgeryTeam, ChecklistItem, SurgeryTime, ChecklistMoment, SurgeryEvent } from '../database/entities';
import { Gateway } from '../websocket/gateway';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SurgeriesService {
  constructor(
    @InjectRepository(Surgery)
    private surgeriesRepository: Repository<Surgery>,
    @InjectRepository(SurgeryTeam)
    private surgeryTeamRepository: Repository<SurgeryTeam>,
    @InjectRepository(ChecklistItem)
    private checklistRepository: Repository<ChecklistItem>,
    @InjectRepository(SurgeryTime)
    private surgeryTimeRepository: Repository<SurgeryTime>,
    private gateway: Gateway,
    private alertsService: AlertsService,
    private auditService: AuditService,
  ) {}

  findAll() {
    return this.surgeriesRepository.find({
      relations: ['patient', 'creador'],
      order: { fecha_programada: 'ASC' },
    });
  }

  findOne(id: string) {
    return this.surgeriesRepository.findOne({
      where: { id },
      relations: ['patient', 'creador', 'team', 'checklist', 'times'],
    });
  }

  async create(createSurgeryDto: any) {
    const surgery = this.surgeriesRepository.create({
      ...createSurgeryDto,
      estado: SurgeryStatus.PREPARADA,
    });
    const savedSurgery = await this.surgeriesRepository.save(surgery) as any;
    
    // Crear items del checklist por defecto
    await this.createDefaultChecklist(savedSurgery.id);
    
    // Log de auditoría
    await this.auditService.logAction(
      savedSurgery.id,
      createSurgeryDto.creada_por,
      'CREAR_CIRUGIA',
      { procedimiento: createSurgeryDto.procedimiento, sitio_quirurgico: createSurgeryDto.sitio_quirurgico },
    );
    
    // Validar y generar alertas
    await this.alertsService.validateSurgeryData(savedSurgery.id);
    
    return this.findOne(savedSurgery.id);
  }

  async update(id: string, updateSurgeryDto: any) {
    const surgery = await this.surgeriesRepository.findOne({ where: { id } });
    if (!surgery) {
      throw new NotFoundException('Cirugía no encontrada');
    }
    this.surgeriesRepository.merge(surgery, updateSurgeryDto);
    const updated = await this.surgeriesRepository.save(surgery);
    
    // Emitir evento de cambio de estado
    this.gateway.server.emit('surgery:estado', {
      surgeryId: updated.id,
      estado: updated.estado,
    });
    
    return this.findOne(updated.id);
  }

  async remove(id: string) {
    const surgery = await this.surgeriesRepository.findOne({ where: { id } });
    if (!surgery) {
      throw new NotFoundException('Cirugía no encontrada');
    }
    
    // Solo permitir eliminar casos en PROGRAMADA o PREPARADA
    if (surgery.estado !== SurgeryStatus.PROGRAMADA && surgery.estado !== SurgeryStatus.PREPARADA) {
      throw new Error('Solo se pueden eliminar casos en estado PROGRAMADA o PREPARADA');
    }
    
    return this.surgeriesRepository.remove(surgery);
  }

  async addTeamMember(surgeryId: string, teamMemberDto: any) {
    const teamMember = this.surgeryTeamRepository.create({
      surgery_id: surgeryId,
      ...teamMemberDto,
    });
    const saved = await this.surgeryTeamRepository.save(teamMember);
    return this.findOne(surgeryId);
  }

  async updateTeamMember(surgeryId: string, teamId: string, updateDto: any) {
    const teamMember = await this.surgeryTeamRepository.findOne({ where: { id: teamId } });
    if (!teamMember) {
      throw new NotFoundException('Miembro del equipo no encontrado');
    }
    this.surgeryTeamRepository.merge(teamMember, updateDto);
    await this.surgeryTeamRepository.save(teamMember);
    return this.findOne(surgeryId);
  }

  async getChecklist(surgeryId: string) {
    return this.checklistRepository.find({
      where: { surgery_id: surgeryId },
      order: { momento: 'ASC', item: 'ASC' },
    });
  }

  async updateChecklistItem(surgeryId: string, itemId: string, updateDto: any) {
    const item = await this.checklistRepository.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Item del checklist no encontrado');
    }
    this.checklistRepository.merge(item, updateDto);
    const updated = await this.checklistRepository.save(item);
    
    // Log de auditoría
    await this.auditService.logAction(
      surgeryId,
      updateDto.completado_por,
      'ACTUALIZAR_CHECKLIST',
      { itemId, item: item.item, completado: updateDto.completado, via: updateDto.via },
    );
    
    // Emitir evento de actualización de checklist
    this.gateway.server.to(`surgery:${surgeryId}`).emit('checklist:actualizado', {
      surgeryId,
      item: updated,
    });
    
    // Validar y generar alertas
    await this.alertsService.validateSurgeryData(surgeryId);
    
    return this.getChecklist(surgeryId);
  }

  async registerTime(surgeryId: string, timeDto: any) {
    // Validar que el checklist correspondiente esté completo antes de avanzar
    const surgery = await this.surgeriesRepository.findOne({
      where: { id: surgeryId },
      relations: ['checklist'],
    });

    if (!surgery) {
      throw new NotFoundException('Cirugía no encontrada');
    }

    // Bloqueo: No permitir INICIO_CIRUGIA si checklist ANTES_INCISION no está completo
    if (timeDto.evento === SurgeryEvent.INICIO_CIRUGIA) {
      const checklistAntesIncision = surgery.checklist?.filter(
        (item) => item.momento === ChecklistMoment.ANTES_INCISION && !item.completado
      );
      if (checklistAntesIncision && checklistAntesIncision.length > 0) {
        throw new Error('No se puede iniciar la cirugía. Faltan items del checklist antes de la incisión.');
      }
    }

    const time = this.surgeryTimeRepository.create({
      surgery_id: surgeryId,
      ...timeDto,
    });
    const saved = await this.surgeryTimeRepository.save(time);
    
    // Log de auditoría
    await this.auditService.logAction(
      surgeryId,
      timeDto.registrado_por,
      'REGISTRAR_TIEMPO',
      { evento: timeDto.evento, via: timeDto.via },
    );
    
    // Emitir evento de tiempo registrado
    this.gateway.server.to(`surgery:${surgeryId}`).emit('tiempo:registrado', {
      surgeryId,
      time: saved,
    });
    
    // Validar y generar alertas
    await this.alertsService.validateSurgeryData(surgeryId);
    
    return this.findOne(surgeryId);
  }

  async getTimes(surgeryId: string) {
    return this.surgeryTimeRepository.find({
      where: { surgery_id: surgeryId },
      order: { timestamp: 'ASC' },
    });
  }

  async getTrazabilidad(surgeryId: string) {
    const auditLogs = await this.auditService.getAuditLogBySurgery(surgeryId);
    const times = await this.getTimes(surgeryId);
    const alerts = await this.alertsService.getAlertsBySurgery(surgeryId);

    return {
      auditLogs,
      times,
      alerts,
    };
  }

  async sendToQuirfano(surgeryId: string) {
    const surgery = await this.surgeriesRepository.findOne({ where: { id: surgeryId } });
    if (!surgery) {
      throw new NotFoundException('Cirugía no encontrada');
    }
    
    surgery.estado = SurgeryStatus.EN_QUIROFANO;
    await this.surgeriesRepository.save(surgery);
    
    // Emitir evento de envío a quirófano
    this.gateway.server.emit('surgery:enviada', {
      surgeryId: surgery.id,
      surgery: await this.findOne(surgery.id),
    });
    
    return this.findOne(surgeryId);
  }

  private async createDefaultChecklist(surgeryId: string) {
    const defaultItems = [
      // ANTES_ANESTESIA
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Identificación del paciente confirmada' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Procedimiento confirmado' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Sitio quirúrgico marcado/confirmado' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Alergias validadas' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Riesgos identificados' },
      { momento: ChecklistMoment.ANTES_ANESTESIA, item: 'Equipamiento verificado' },
      
      // ANTES_INCISION
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Paciente confirmado' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Procedimiento confirmado' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Sitio quirúrgico confirmado' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Equipo quirúrgico completo' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Antibiótico profiláctico administrado' },
      { momento: ChecklistMoment.ANTES_INCISION, item: 'Riesgos previstos revisados' },
      
      // ANTES_SALIR
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Recuento de instrumental completo' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Recuento de gasas completo' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Muestras identificadas' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Novedades registradas' },
      { momento: ChecklistMoment.ANTES_SALIR, item: 'Procedimiento realizado documentado' },
    ];

    for (const item of defaultItems) {
      const checklistItem = this.checklistRepository.create({
        surgery_id: surgeryId,
        ...item,
        completado: false,
      });
      await this.checklistRepository.save(checklistItem);
    }
  }
}
