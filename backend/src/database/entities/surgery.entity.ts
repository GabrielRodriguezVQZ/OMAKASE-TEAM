import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Patient } from './patient.entity';
import { User } from './user.entity';
import { SurgeryTeam } from './surgery-team.entity';
import { ChecklistItem } from './checklist-item.entity';
import { SurgeryTime } from './surgery-time.entity';

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

  @OneToMany(() => SurgeryTeam, (team) => team.surgery)
  team: SurgeryTeam[];

  @OneToMany(() => ChecklistItem, (checklist) => checklist.surgery)
  checklist: ChecklistItem[];

  @OneToMany(() => SurgeryTime, (time) => time.surgery)
  times: SurgeryTime[];

  @CreateDateColumn()
  creado_en: Date;
}
