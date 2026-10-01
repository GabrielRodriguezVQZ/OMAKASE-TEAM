import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Surgery } from './surgery.entity';
import { User } from './user.entity';

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ABIERTA = 'ABIERTA',
  RESUELTA = 'RESUELTA',
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  surgery_id: string;

  @ManyToOne(() => Surgery)
  @JoinColumn({ name: 'surgery_id' })
  surgery: Surgery;

  @Column()
  tipo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.WARNING,
  })
  severidad: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.ABIERTA,
  })
  estado: AlertStatus;

  @CreateDateColumn()
  creada_en: Date;

  @Column({ nullable: true })
  resuelta_por: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'resuelta_por' })
  resolvedor: User;

  @Column({ type: 'timestamp', nullable: true })
  resuelta_en: Date;
}
