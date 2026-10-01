import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('patients')
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Get()
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los pacientes' })
  @ApiResponse({ status: 200, description: 'Lista de pacientes' })
  findAll() {
    return this.patientsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener un paciente por ID' })
  @ApiResponse({ status: 200, description: 'Paciente encontrado' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo paciente' })
  @ApiResponse({ status: 201, description: 'Paciente creado' })
  create(@Body() createPatientDto: any) {
    return this.patientsService.create(createPatientDto);
  }

  @Put(':id')
  @Roles(UserRole.ENFERMERIA, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar un paciente' })
  @ApiResponse({ status: 200, description: 'Paciente actualizado' })
  update(@Param('id') id: string, @Body() updatePatientDto: any) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar un paciente' })
  @ApiResponse({ status: 200, description: 'Paciente eliminado' })
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }
}
