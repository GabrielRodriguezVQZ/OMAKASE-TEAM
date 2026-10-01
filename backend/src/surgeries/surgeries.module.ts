import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surgery, SurgeryTeam, ChecklistItem, SurgeryTime } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Surgery, SurgeryTeam, ChecklistItem, SurgeryTime])],
})
export class SurgeriesModule {}
