import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surgery, SurgeryStatus, ChecklistItem, Alert, SurgeryTime, AlertStatus } from '../database/entities';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Surgery)
    private surgeriesRepository: Repository<Surgery>,
    @InjectRepository(ChecklistItem)
    private checklistRepository: Repository<ChecklistItem>,
    @InjectRepository(Alert)
    private alertsRepository: Repository<Alert>,
    @InjectRepository(SurgeryTime)
    private surgeryTimeRepository: Repository<SurgeryTime>,
  ) {}

  async getResumen() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cirugías hoy
    const surgeriesToday = await this.surgeriesRepository
      .createQueryBuilder('surgery')
      .where('surgery.fecha_programada >= :today', { today })
      .getMany();

    // Checklists completos
    const allChecklistItems = await this.checklistRepository.find();
    const totalChecklistItems = allChecklistItems.length;
    const completedChecklistItems = allChecklistItems.filter((item) => item.completado).length;
    const cumplimientoChecklist = totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0;

    // Alertas
    const alertsToday = await this.alertsRepository
      .createQueryBuilder('alert')
      .where('alert.creada_en >= :today', { today })
      .getMany();
    const openAlerts = alertsToday.filter((a) => a.estado === AlertStatus.ABIERTA).length;
    const resolvedAlerts = alertsToday.filter((a) => a.estado === AlertStatus.RESUELTA).length;

    // Tiempos promedio (simplificado)
    const surgeryTimes = await this.surgeryTimeRepository.find();
    const surgeriesWithTimes = await this.surgeriesRepository
      .createQueryBuilder('surgery')
      .leftJoinAndSelect('surgery.times', 'time')
      .where('surgery.estado = :estado', { estado: SurgeryStatus.FINALIZADA })
      .getMany();

    let tiempoPromedio = 0;
    if (surgeriesWithTimes.length > 0 && surgeryTimes.length > 0) {
      const inicioCirugiaTimes = surgeryTimes.filter((t) => t.evento === 'INICIO_CIRUGIA');
      const finCirugiaTimes = surgeryTimes.filter((t) => t.evento === 'FIN_CIRUGIA');
      
      if (inicioCirugiaTimes.length > 0 && finCirugiaTimes.length > 0) {
        const totalDuration = finCirugiaTimes.reduce((sum, fin) => {
          const inicio = inicioCirugiaTimes.find((i) => i.surgery_id === fin.surgery_id);
          if (inicio) {
            return sum + (new Date(fin.timestamp).getTime() - new Date(inicio.timestamp).getTime());
          }
          return sum;
        }, 0);
        tiempoPromedio = totalDuration / inicioCirugiaTimes.length / 60000; // en minutos
      }
    }

    // Incidencias (alertas críticas)
    const criticalAlerts = alertsToday.filter((a) => a.severidad === 'CRITICAL').length;

    return {
      cirugias_hoy: surgeriesToday.length,
      cirugias_finalizadas: surgeriesToday.filter((s) => s.estado === SurgeryStatus.FINALIZADA).length,
      cirugias_en_curso: surgeriesToday.filter((s) => s.estado === SurgeryStatus.EN_CURSO).length,
      checklists_completos: completedChecklistItems,
      checklists_pendientes: totalChecklistItems - completedChecklistItems,
      cumplimiento_porcentaje: Math.round(cumplimientoChecklist),
      alertas_abiertas: openAlerts,
      alertas_resueltas: resolvedAlerts,
      alertas_criticas: criticalAlerts,
      tiempo_promedio_minutos: Math.round(tiempoPromedio),
      incidencias: criticalAlerts,
    };
  }
}
