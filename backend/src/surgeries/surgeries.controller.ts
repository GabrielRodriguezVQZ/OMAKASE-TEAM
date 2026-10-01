import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SurgeriesService } from './surgeries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('surgeries')
@Controller('surgeries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SurgeriesController {
  constructor(private surgeriesService: SurgeriesService) {}

  @Get()
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todas las cirugías' })
  @ApiResponse({ status: 200, description: 'Lista de cirugías' })
  findAll() {
    return this.surgeriesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener una cirugía por ID' })
  @ApiResponse({ status: 200, description: 'Cirugía encontrada' })
  findOne(@Param('id') id: string) {
    return this.surgeriesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva cirugía' })
  @ApiResponse({ status: 201, description: 'Cirugía creada' })
  create(@Body() createSurgeryDto: any) {
    return this.surgeriesService.create(createSurgeryDto);
  }

  @Put(':id')
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar una cirugía' })
  @ApiResponse({ status: 200, description: 'Cirugía actualizada' })
  update(@Param('id') id: string, @Body() updateSurgeryDto: any) {
    return this.surgeriesService.update(id, updateSurgeryDto);
  }

  @Delete(':id')
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar una cirugía' })
  @ApiResponse({ status: 200, description: 'Cirugía eliminada' })
  remove(@Param('id') id: string) {
    return this.surgeriesService.remove(id);
  }

  @Post(':id/team')
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Agregar miembro al equipo quirúrgico' })
  @ApiResponse({ status: 201, description: 'Miembro agregado' })
  addTeamMember(@Param('id') id: string, @Body() teamMemberDto: any) {
    return this.surgeriesService.addTeamMember(id, teamMemberDto);
  }

  @Put(':id/team/:teamId')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar miembro del equipo' })
  @ApiResponse({ status: 200, description: 'Miembro actualizado' })
  updateTeamMember(@Param('id') id: string, @Param('teamId') teamId: string, @Body() updateDto: any) {
    return this.surgeriesService.updateTeamMember(id, teamId, updateDto);
  }

  @Get(':id/checklist')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener checklist de una cirugía' })
  @ApiResponse({ status: 200, description: 'Checklist' })
  getChecklist(@Param('id') id: string) {
    return this.surgeriesService.getChecklist(id);
  }

  @Put(':id/checklist/:itemId')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar item del checklist' })
  @ApiResponse({ status: 200, description: 'Item actualizado' })
  updateChecklistItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() updateDto: any) {
    return this.surgeriesService.updateChecklistItem(id, itemId, updateDto);
  }

  @Post(':id/times')
  @Roles(UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar tiempo de cirugía' })
  @ApiResponse({ status: 201, description: 'Tiempo registrado' })
  registerTime(@Param('id') id: string, @Body() timeDto: any) {
    return this.surgeriesService.registerTime(id, timeDto);
  }

  @Get(':id/times')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener tiempos de una cirugía' })
  @ApiResponse({ status: 200, description: 'Tiempos' })
  getTimes(@Param('id') id: string) {
    return this.surgeriesService.getTimes(id);
  }

  @Get(':id/trazabilidad')
  @Roles(UserRole.ENFERMERIA, UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener línea de tiempo de trazabilidad' })
  @ApiResponse({ status: 200, description: 'Línea de tiempo' })
  async getTrazabilidad(@Param('id') id: string) {
    return this.surgeriesService.getTrazabilidad(id);
  }

  @Post(':id/enviar-quirfano')
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Enviar cirugía a quirófano' })
  @ApiResponse({ status: 200, description: 'Cirugía enviada' })
  sendToQuirfano(@Param('id') id: string) {
    return this.surgeriesService.sendToQuirfano(id);
  }

  @Get(':id/flujo')
  @Roles(UserRole.QUIROFANO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener flujo de una cirugía' })
  @ApiResponse({ status: 200, description: 'Flujo de la cirugía' })
  getFlujo(@Param('id') id: string) {
    return this.surgeriesService.getFlujo(id);
  }
}
