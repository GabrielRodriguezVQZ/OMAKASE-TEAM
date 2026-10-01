import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert, Surgery } from '../database/entities';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Gateway } from '../websocket/gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, Surgery]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService, Gateway],
  exports: [AlertsService],
})
export class AlertsModule {}
