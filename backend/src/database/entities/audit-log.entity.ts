import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Surgery } from './surgery.entity';
import { User } from './user.entity';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  surgery_id: string;

  @ManyToOne(() => Surgery)
  @JoinColumn({ name: 'surgery_id' })
  surgery: Surgery;

  @Column()
  usuario_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column()
  accion: string;

  @Column({ type: 'jsonb' })
  detalle: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}
