import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Surgery } from './surgery.entity';
import { User } from './user.entity';

export enum ChecklistMoment {
  ANTES_ANESTESIA = 'ANTES_ANESTESIA',
  ANTES_INCISION = 'ANTES_INCISION',
  ANTES_SALIR = 'ANTES_SALIR',
}

export enum CompletionVia {
  MANUAL = 'MANUAL',
  VOZ = 'VOZ',
}

@Entity('checklist_items')
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  surgery_id: string;

  @ManyToOne(() => Surgery)
  @JoinColumn({ name: 'surgery_id' })
  surgery: Surgery;

  @Column({
    type: 'enum',
    enum: ChecklistMoment,
  })
  momento: ChecklistMoment;

  @Column()
  item: string;

  @Column({ default: false })
  completado: boolean;

  @Column({ nullable: true })
  completado_por: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'completado_por' })
  completador: User;

  @Column({ type: 'timestamp', nullable: true })
  completado_en: Date;

  @Column({
    type: 'enum',
    enum: CompletionVia,
    nullable: true,
  })
  via: CompletionVia;

  @CreateDateColumn()
  creado_en: Date;
}
