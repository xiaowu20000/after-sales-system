import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mail_configs')
export class MailConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  host: string;

  @Column()
  port: number;

  @Column({ default: false })
  secure: boolean;

  @Column({ length: 120 })
  user: string;

  @Column({ length: 255 })
  pass: string;

  @Column({ length: 120 })
  fromEmail: string;
}
