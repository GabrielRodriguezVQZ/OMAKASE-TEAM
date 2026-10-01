import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Surgery, ChecklistItem, Alert, SurgeryTime } from '../database/entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Surgery, ChecklistItem, Alert, SurgeryTime]),
    AuditModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
