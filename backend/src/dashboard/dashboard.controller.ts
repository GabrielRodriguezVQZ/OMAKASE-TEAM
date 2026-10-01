import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private httpService: HttpService,
  ) {}

  @Get('resumen')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener resumen del dashboard' })
  @ApiResponse({ status: 200, description: 'Resumen del dashboard' })
  getResumen() {
    return this.dashboardService.getResumen();
  }

  @Post('analytics/duracion-estimada')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener duración estimada de procedimiento' })
  @ApiResponse({ status: 200, description: 'Duración estimada' })
  async getDuracionEstimada(@Body() body: { procedimiento: string }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'http://analytics:8000/analytics/duracion-estimada',
          body,
        )
      );
      return response.data;
    } catch (error) {
      return {
        procedimiento: body.procedimiento,
        duracion_estimada_minutos: 60,
        fuente: 'error_fallback',
      };
    }
  }

  @Get('analytics/omisiones-frecuentes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener omisiones frecuentes en checklist' })
  @ApiResponse({ status: 200, description: 'Omisiones frecuentes' })
  async getOmisionesFrecuentes() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          'http://analytics:8000/analytics/omisiones-frecuentes',
        )
      );
      return response.data;
    } catch (error) {
      return {
        omisiones: [],
        total_checklists_analizados: 0,
        fuente: 'error_fallback',
      };
    }
  }
}
