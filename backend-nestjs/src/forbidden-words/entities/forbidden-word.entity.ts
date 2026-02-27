import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('forbidden_words')
export class ForbiddenWord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  word: string;
}
