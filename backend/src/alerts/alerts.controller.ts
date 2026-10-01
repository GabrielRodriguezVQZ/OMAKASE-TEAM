import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('alerts')
@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get('surgery/:surgeryId')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener alertas de una cirugía' })
  @ApiResponse({ status: 200, description: 'Lista de alertas' })
  getAlertsBySurgery(@Param('surgeryId') surgeryId: string) {
    return this.alertsService.getAlertsBySurgery(surgeryId);
  }

  @Post('validate/:surgeryId')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Validar datos de cirugía y generar alertas' })
  @ApiResponse({ status: 200, description: 'Alertas generadas' })
  validateSurgeryData(@Param('surgeryId') surgeryId: string) {
    return this.alertsService.validateSurgeryData(surgeryId);
  }

  @Post(':alertId/resolve')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolver una alerta' })
  @ApiResponse({ status: 200, description: 'Alerta resuelta' })
  resolveAlert(@Param('alertId') alertId: string, @Body() body: { userId: string }) {
    return this.alertsService.resolveAlert(alertId, body.userId);
  }
}
