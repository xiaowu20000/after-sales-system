import { IsString, MaxLength } from 'class-validator';

export class CreateQuickPhraseDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  content: string;
}
