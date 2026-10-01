import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('surgery/:surgeryId')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener log de auditoría de una cirugía' })
  @ApiResponse({ status: 200, description: 'Log de auditoría' })
  getAuditLogBySurgery(@Param('surgeryId') surgeryId: string) {
    return this.auditService.getAuditLogBySurgery(surgeryId);
  }
}
