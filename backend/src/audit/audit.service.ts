import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAction(
    surgeryId: string,
    usuarioId: string,
    accion: string,
    detalle: Record<string, any>,
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      surgery_id: surgeryId,
      usuario_id: usuarioId,
      accion,
      detalle,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async getAuditLogBySurgery(surgeryId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { surgery_id: surgeryId },
      order: { timestamp: 'ASC' },
    });
  }
}
