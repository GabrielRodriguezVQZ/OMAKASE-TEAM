import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../database/entities';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
  ) {}

  findAll() {
    return this.patientsRepository.find();
  }

  findOne(id: string) {
    return this.patientsRepository.findOne({ where: { id } });
  }

  async create(createPatientDto: any) {
    const patient = this.patientsRepository.create(createPatientDto);
    return this.patientsRepository.save(patient);
  }

  async update(id: string, updatePatientDto: any) {
    const patient = await this.patientsRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }
    this.patientsRepository.merge(patient, updatePatientDto);
    return this.patientsRepository.save(patient);
  }

  async remove(id: string) {
    const patient = await this.patientsRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }
    return this.patientsRepository.remove(patient);
  }
}
