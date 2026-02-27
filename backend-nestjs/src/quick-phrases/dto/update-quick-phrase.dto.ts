import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateQuickPhraseDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
