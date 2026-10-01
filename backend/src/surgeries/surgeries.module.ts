import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surgery, SurgeryTeam, ChecklistItem, SurgeryTime, Patient } from '../database/entities';
import { SurgeriesController } from './surgeries.controller';
import { SurgeriesService } from './surgeries.service';
import { Gateway } from '../websocket/gateway';
import { AlertsModule } from '../alerts/alerts.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Surgery, SurgeryTeam, ChecklistItem, SurgeryTime, Patient]),
    AlertsModule,
    AuditModule,
  ],
  controllers: [SurgeriesController],
  providers: [SurgeriesService, Gateway],
  exports: [SurgeriesService],
})
export class SurgeriesModule {}
