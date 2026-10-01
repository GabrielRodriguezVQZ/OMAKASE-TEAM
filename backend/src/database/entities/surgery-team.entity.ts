import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Surgery } from './surgery.entity';
import { User } from './user.entity';

export enum SurgicalRole {
  CIRUJANO = 'CIRUJANO',
  ANESTESIOLOGO = 'ANESTESIOLOGO',
  INSTRUMENTADOR = 'INSTRUMENTADOR',
  AUXILIAR_ENFERMERIA = 'AUXILIAR_ENFERMERIA',
  OTRO = 'OTRO',
}

@Entity('surgery_team')
export class SurgeryTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  surgery_id: string;

  @ManyToOne(() => Surgery, (surgery) => surgery.team)
  @JoinColumn({ name: 'surgery_id' })
  surgery: Surgery;

  @Column()
  nombre: string;

  @Column({
    type: 'enum',
    enum: SurgicalRole,
  })
  rol_quirurgico: SurgicalRole;

  @Column({ nullable: true })
  verificado_por: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'verificado_por' })
  verificador: User;

  @Column({ type: 'timestamp', nullable: true })
  verificado_en: Date;

  @CreateDateColumn()
  creado_en: Date;
}
