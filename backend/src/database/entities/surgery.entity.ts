import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Patient } from './patient.entity';
import { User } from './user.entity';

export enum SurgeryStatus {
  PROGRAMADA = 'PROGRAMADA',
  PREPARADA = 'PREPARADA',
  EN_QUIROFANO = 'EN_QUIROFANO',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
  EN_RECUPERACION = 'EN_RECUPERACION',
}

@Entity('surgeries')
export class Surgery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patient_id: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column()
  procedimiento: string;

  @Column()
  sitio_quirurgico: string;

  @Column()
  quirofano: string;

  @Column({
    type: 'enum',
    enum: SurgeryStatus,
    default: SurgeryStatus.PROGRAMADA,
  })
  estado: SurgeryStatus;

  @Column({ type: 'timestamp' })
  fecha_programada: Date;

  @Column()
  creada_por: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creada_por' })
  creador: User;

  @CreateDateColumn()
  creado_en: Date;
}
