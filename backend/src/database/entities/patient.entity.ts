import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  documento: string;

  @Column()
  edad: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  peso: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  talla: number;

  @Column({ type: 'text', nullable: true })
  alergias: string;

  @Column({ type: 'text', nullable: true })
  info_clinica: string;

  @Column({ nullable: true })
  glucometria: string;

  @Column({ nullable: true })
  reserva_sangre: string;

  @CreateDateColumn()
  creado_en: Date;
}
