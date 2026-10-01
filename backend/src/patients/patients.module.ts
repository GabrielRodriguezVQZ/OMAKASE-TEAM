import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
})
export class PatientsModule {}
