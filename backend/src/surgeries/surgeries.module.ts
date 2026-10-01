import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surgery, SurgeryTeam, ChecklistItem, SurgeryTime, Patient } from '../database/entities';
import { SurgeriesController } from './surgeries.controller';
import { SurgeriesService } from './surgeries.service';
import { Gateway } from '../websocket/gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Surgery, SurgeryTeam, ChecklistItem, SurgeryTime, Patient]),
  ],
  controllers: [SurgeriesController],
  providers: [SurgeriesService, Gateway],
  exports: [SurgeriesService],
})
export class SurgeriesModule {}
