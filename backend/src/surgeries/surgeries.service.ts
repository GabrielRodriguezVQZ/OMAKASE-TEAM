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
    
    // NOTA: No validamos alertas al marcar items del checklist para evitar spam de alertas
    // Las alertas se generan solo al crear la cirugía y al registrar tiempos
    
    return this.getChecklist(surgeryId);
  }

  async registerTime(surgeryId: string, timeDto: any) {
    console.log('registerTime - surgeryId:', surgeryId);
    console.log('registerTime - timeDto:', timeDto);
    
    const surgery = await this.surgeriesRepository.findOne({
      where: { id: surgeryId },
      relations: ['checklist', 'times'],
    });

    if (!surgery) {
      throw new NotFoundException('Cirugía no encontrada');
    }

    console.log('registerTime - surgery times:', surgery.times);

    // Definir orden de eventos
    const eventOrder = [
      SurgeryEvent.INGRESO_PACIENTE,
      SurgeryEvent.INICIO_ANESTESIA,
      SurgeryEvent.INICIO_CIRUGIA,
      SurgeryEvent.FIN_CIRUGIA,
      SurgeryEvent.SALIDA_RECUPERACION,
    ];

    // Validar orden de eventos
    const registeredEvents = surgery.times || [];
    const eventIndex = eventOrder.indexOf(timeDto.evento);
    
    console.log('registerTime - registeredEvents:', registeredEvents);
    console.log('registerTime - eventIndex:', eventIndex);
    
    if (registeredEvents.length > 0) {
      const lastEvent = registeredEvents[registeredEvents.length - 1].evento;
      const lastEventIndex = eventOrder.indexOf(lastEvent);
      
      console.log('registerTime - lastEvent:', lastEvent);
      console.log('registerTime - lastEventIndex:', lastEventIndex);
      
      if (eventIndex !== lastEventIndex + 1) {
        throw new Error(
          `Orden de eventos incorrecto. Se esperaba: ${eventOrder[lastEventIndex + 1]}, recibido: ${timeDto.evento}`
        );
      }
    } else if (eventIndex !== 0) {
      throw new Error(
        `El primer evento debe ser ${eventOrder[0]}, recibido: ${timeDto.evento}`
      );
    }

    // Validar checklist según la fase
    if (timeDto.evento === SurgeryEvent.INICIO_ANESTESIA) {
      const checklistAntesAnestesia = surgery.checklist?.filter(
        (item) => item.momento === ChecklistMoment.ANTES_ANESTESIA && !item.completado
      );
      if (checklistAntesAnestesia && checklistAntesAnestesia.length > 0) {
        throw new Error(
          'No se puede iniciar la anestesia. Faltan items del checklist antes de la anestesia.'
        );
      }
    }

    if (timeDto.evento === SurgeryEvent.INICIO_CIRUGIA) {
      const checklistAntesIncision = surgery.checklist?.filter(
        (item) => item.momento === ChecklistMoment.ANTES_INCISION && !item.completado
      );
      if (checklistAntesIncision && checklistAntesIncision.length > 0) {
        throw new Error(
          'No se puede iniciar la cirugía. Faltan items del checklist antes de la incisión.'
        );
      }
    }

    if (timeDto.evento === SurgeryEvent.FIN_CIRUGIA) {
      const checklistAntesSalir = surgery.checklist?.filter(
        (item) => item.momento === ChecklistMoment.ANTES_SALIR && !item.completado
      );
      if (checklistAntesSalir && checklistAntesSalir.length > 0) {
        throw new Error(
          'No se puede finalizar la cirugía. Faltan items del checklist antes de salir.'
        );
      }
    }

    const time = this.surgeryTimeRepository.create({
      surgery_id: surgeryId,
      ...timeDto,
    });
    const saved = await this.surgeryTimeRepository.save(time);
    
    // Actualizar estado de la cirugía según el evento
    let newStatus = surgery.estado;
    if (timeDto.evento === SurgeryEvent.INGRESO_PACIENTE) {
      newStatus = SurgeryStatus.EN_QUIROFANO;
    } else if (timeDto.evento === SurgeryEvent.INICIO_CIRUGIA) {
      newStatus = SurgeryStatus.EN_CURSO;
    } else if (timeDto.evento === SurgeryEvent.FIN_CIRUGIA) {
      newStatus = SurgeryStatus.FINALIZADA;
    } else if (timeDto.evento === SurgeryEvent.SALIDA_RECUPERACION) {
      newStatus = SurgeryStatus.EN_RECUPERACION;
    }

    if (newStatus !== surgery.estado) {
      await this.surgeriesRepository.update(surgeryId, { estado: newStatus });
      surgery.estado = newStatus; // Actualizar el objeto local
      
      // Emitir evento de cambio de estado
      this.gateway.server.emit('surgery:estado', {
        surgeryId: surgery.id,
        estado: newStatus,
      });
    }
    
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
    
    // Emitir evento de flujo actualizado
    const flujo = await this.getFlujo(surgeryId);
    this.gateway.server.to(`surgery:${surgeryId}`).emit('flujo:actualizado', flujo);
    
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

  async getFlujo(surgeryId: string) {
    const surgery = await this.surgeriesRepository.findOne({
      where: { id: surgeryId },
      relations: ['checklist', 'times'],
    });

    if (!surgery) {
      throw new NotFoundException('Cirugía no encontrada');
    }

    // Definir orden de eventos
    const eventOrder = [
      SurgeryEvent.INGRESO_PACIENTE,
      SurgeryEvent.INICIO_ANESTESIA,
      SurgeryEvent.INICIO_CIRUGIA,
      SurgeryEvent.FIN_CIRUGIA,
      SurgeryEvent.SALIDA_RECUPERACION,
    ];

    // Encontrar la fase actual basada en el último evento registrado
    const registeredEvents = surgery.times || [];
    let currentPhase = 1; // Fase 1: Ingreso del paciente

    if (registeredEvents.length > 0) {
      const lastEvent = registeredEvents[registeredEvents.length - 1].evento;
      const lastEventIndex = eventOrder.indexOf(lastEvent);
      currentPhase = lastEventIndex + 2; // Siguiente fase
      if (currentPhase > 5) currentPhase = 5; // Máximo fase 5
    }

    // Obtener checklist por momento con orden explícito
    const allChecklist = surgery.checklist || [];
    const checklistAntesAnestesia = allChecklist
      .filter((item) => item.momento === ChecklistMoment.ANTES_ANESTESIA)
      .sort((a, b) => a.item.localeCompare(b.item));
    const checklistAntesIncision = allChecklist
      .filter((item) => item.momento === ChecklistMoment.ANTES_INCISION)
      .sort((a, b) => a.item.localeCompare(b.item));
    const checklistAntesSalir = allChecklist
      .filter((item) => item.momento === ChecklistMoment.ANTES_SALIR)
      .sort((a, b) => a.item.localeCompare(b.item));

    // Calcular estado de cada checklist
    const checklistStatus = {
      antesAnestesia: {
        items: checklistAntesAnestesia,
        completado: checklistAntesAnestesia.every((item) => item.completado),
        pendientes: checklistAntesAnestesia.filter((item) => !item.completado),
      },
      antesIncision: {
        items: checklistAntesIncision,
        completado: checklistAntesIncision.every((item) => item.completado),
        pendientes: checklistAntesIncision.filter((item) => !item.completado),
      },
      antesSalir: {
        items: checklistAntesSalir,
        completado: checklistAntesSalir.every((item) => item.completado),
        pendientes: checklistAntesSalir.filter((item) => !item.completado),
      },
    };

    return {
      surgeryId: surgery.id,
      estado: surgery.estado,
      currentPhase,
      events: registeredEvents,
      checklistStatus,
    };
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
