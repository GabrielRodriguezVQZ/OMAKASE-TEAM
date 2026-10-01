import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('resumen')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener resumen del dashboard' })
  @ApiResponse({ status: 200, description: 'Resumen del dashboard' })
  getResumen() {
    return this.dashboardService.getResumen();
  }
}
