import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quick_phrases')
export class QuickPhrase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ type: 'text' })
  content: string;
}
