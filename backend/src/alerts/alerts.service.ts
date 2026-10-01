import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert, AlertSeverity, AlertStatus } from '../database/entities';
import { Surgery, SurgeryStatus } from '../database/entities';
import { Gateway } from '../websocket/gateway';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private alertsRepository: Repository<Alert>,
    @InjectRepository(Surgery)
    private surgeriesRepository: Repository<Surgery>,
    private gateway: Gateway,
  ) {}

  async validateSurgeryData(surgeryId: string): Promise<Alert[]> {
    const surgery = await this.surgeriesRepository.findOne({
      where: { id: surgeryId },
      relations: ['patient', 'checklist', 'times'],
    });

    if (!surgery) {
      return [];
    }

    const alerts: Alert[] = [];

    // Regla 1: Faltan datos obligatorios del paciente
    if (!surgery.patient?.nombre || !surgery.patient?.documento) {
      alerts.push(
        this.createAlert(
          surgeryId,
          'DATOS_FALTANTES',
          'Faltan datos obligatorios del paciente (nombre o documento)',
          AlertSeverity.ERROR,
        ),
      );
    }

    // Regla 2: Alergias sin validar
    if (!surgery.patient?.alergias) {
      alerts.push(
        this.createAlert(
          surgeryId,
          'ALERGIAS_SIN_VALIDAR',
          'Alergias no registradas o sin validar',
          AlertSeverity.WARNING,
        ),
      );
    }

    // Regla 3: Sitio quirúrgico sin confirmar
    if (!surgery.sitio_quirurgico) {
      alerts.push(
        this.createAlert(
          surgeryId,
          'SITIO_SIN_CONFIRMAR',
          'Sitio quirúrgico no confirmado',
          AlertSeverity.ERROR,
        ),
      );
    }

    // Regla 4: Antibiótico no registrado antes de la incisión
    const checklistAntesIncision = surgery.checklist?.filter(
      (item) => item.momento === 'ANTES_INCISION' && item.item.includes('Antibiótico'),
    );
    if (checklistAntesIncision && checklistAntesIncision.length > 0) {
      const antibioticoItem = checklistAntesIncision[0];
      if (!antibioticoItem.completado && surgery.estado === SurgeryStatus.EN_CURSO) {
        alerts.push(
          this.createAlert(
            surgeryId,
            'ANTIBIOTICO_NO_REGISTRADO',
            'Antibiótico profiláctico no registrado antes de la incisión',
            AlertSeverity.CRITICAL,
          ),
        );
      }
    }

    // Regla 5: Recuento de material pendiente antes de salir
    const checklistAntesSalir = surgery.checklist?.filter(
      (item) => item.momento === 'ANTES_SALIR' && (item.item.includes('instrumental') || item.item.includes('gasas')),
    );
    if (checklistAntesSalir && checklistAntesSalir.length > 0) {
      const recuentoItems = checklistAntesSalir;
      const pendientes = recuentoItems.filter((item) => !item.completado);
      if (pendientes.length > 0 && surgery.estado === SurgeryStatus.FINALIZADA) {
        alerts.push(
          this.createAlert(
            surgeryId,
            'RECUENTO_PENDIENTE',
            'Recuento de material (instrumental/gasas) pendiente antes de salir',
            AlertSeverity.CRITICAL,
          ),
        );
      }
    }

    // Regla 6: Etapa del checklist sin completar al intentar avanzar
    const checklistAntesAnestesia = surgery.checklist?.filter(
      (item) => item.momento === 'ANTES_ANESTESIA',
    );
    const pendientesAnestesia = checklistAntesAnestesia?.filter((item) => !item.completado);
    if (pendientesAnestesia && pendientesAnestesia.length > 0 && surgery.estado === SurgeryStatus.EN_QUIROFANO) {
      alerts.push(
        this.createAlert(
          surgeryId,
          'CHECKLIST_PRE_ANESTESIA_PENDIENTE',
          'Checklist antes de anestesia incompleto',
          AlertSeverity.WARNING,
        ),
      );
    }

    // Guardar alertas en la base de datos
    for (const alert of alerts) {
      await this.alertsRepository.save(alert);
      // Emitir alerta por WebSocket
      this.gateway.server.emit('alerta:nueva', {
        surgeryId,
        alert,
      });
    }

    return alerts;
  }

  async resolveAlert(alertId: string, userId: string): Promise<Alert> {
    const alert = await this.alertsRepository.findOne({ where: { id: alertId } });
    if (!alert) {
      throw new Error('Alerta no encontrada');
    }

    alert.estado = AlertStatus.RESUELTA;
    alert.resuelta_por = userId;
    alert.resuelta_en = new Date();

    const resolved = await this.alertsRepository.save(alert);

    // Emitir resolución por WebSocket
    this.gateway.server.emit('alerta:resuelta', {
      surgeryId: alert.surgery_id,
      alert: resolved,
    });

    return resolved;
  }

  async getAlertsBySurgery(surgeryId: string): Promise<Alert[]> {
    return this.alertsRepository.find({
      where: { surgery_id: surgeryId },
      order: { creada_en: 'DESC' },
    });
  }

  private createAlert(
    surgeryId: string,
    tipo: string,
    mensaje: string,
    severidad: AlertSeverity,
  ): Alert {
    return this.alertsRepository.create({
      surgery_id: surgeryId,
      tipo,
      mensaje,
      severidad,
      estado: AlertStatus.ABIERTA,
    });
  }
}
