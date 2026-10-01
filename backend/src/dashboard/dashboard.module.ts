import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Surgery, ChecklistItem, Alert, SurgeryTime } from '../database/entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Surgery, ChecklistItem, Alert, SurgeryTime]),
    HttpModule,
    AuditModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
