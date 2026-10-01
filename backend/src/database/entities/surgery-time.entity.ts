import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Surgery } from './surgery.entity';
import { User } from './user.entity';

export enum SurgeryEvent {
  INGRESO_PACIENTE = 'INGRESO_PACIENTE',
  INICIO_ANESTESIA = 'INICIO_ANESTESIA',
  INICIO_CIRUGIA = 'INICIO_CIRUGIA',
  FIN_CIRUGIA = 'FIN_CIRUGIA',
  SALIDA_RECUPERACION = 'SALIDA_RECUPERACION',
}

export enum CompletionVia {
  MANUAL = 'MANUAL',
  VOZ = 'VOZ',
}

@Entity('surgery_times')
export class SurgeryTime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  surgery_id: string;

  @ManyToOne(() => Surgery)
  @JoinColumn({ name: 'surgery_id' })
  surgery: Surgery;

  @Column({
    type: 'enum',
    enum: SurgeryEvent,
  })
  evento: SurgeryEvent;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column()
  registrado_por: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'registrado_por' })
  registrador: User;

  @Column({
    type: 'enum',
    enum: CompletionVia,
    default: CompletionVia.MANUAL,
  })
  via: CompletionVia;

  @CreateDateColumn()
  creado_en: Date;
}
