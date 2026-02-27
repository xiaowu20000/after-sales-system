import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('email_codes')
export class EmailCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  email: string;

  @Column({ length: 20 })
  code: string;

  @Column({ length: 30, default: 'REGISTER' })
  purpose: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
