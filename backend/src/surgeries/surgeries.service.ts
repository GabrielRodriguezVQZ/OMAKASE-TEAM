import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surgery, SurgeryStatus, SurgeryTeam, ChecklistItem, SurgeryTime, ChecklistMoment, SurgeryEvent } from '../database/entities';
import { Gateway } from '../websocket/gateway';

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
    
    // Emitir evento de actualización de checklist
    this.gateway.server.to(`surgery:${surgeryId}`).emit('checklist:actualizado', {
      surgeryId,
      item: updated,
    });
    
    return this.getChecklist(surgeryId);
  }

  async registerTime(surgeryId: string, timeDto: any) {
    const time = this.surgeryTimeRepository.create({
      surgery_id: surgeryId,
      ...timeDto,
    });
    const saved = await this.surgeryTimeRepository.save(time);
    
    // Emitir evento de tiempo registrado
    this.gateway.server.to(`surgery:${surgeryId}`).emit('tiempo:registrado', {
      surgeryId,
      time: saved,
    });
    
    return this.findOne(surgeryId);
  }

  async getTimes(surgeryId: string) {
    return this.surgeryTimeRepository.find({
      where: { surgery_id: surgeryId },
      order: { timestamp: 'ASC' },
    });
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
