import { IsString, IsDate, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { SurgeryStatus } from '../../database/entities';

export class CreateSurgeryDto {
  @IsUUID()
  patient_id: string;

  @IsString()
  procedimiento: string;

  @IsString()
  sitio_quirurgico: string;

  @IsString()
  quirofano: string;

  @IsDate()
  fecha_programada: Date;

  @IsString()
  creada_por: string;
}

export class UpdateSurgeryDto {
  @IsOptional()
  @IsEnum(SurgeryStatus)
  estado?: SurgeryStatus;

  @IsOptional()
  @IsString()
  procedimiento?: string;

  @IsOptional()
  @IsString()
  sitio_quirurgico?: string;

  @IsOptional()
  @IsString()
  quirofano?: string;
}
