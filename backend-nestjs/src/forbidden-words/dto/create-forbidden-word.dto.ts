import { IsString, MaxLength } from 'class-validator';

export class CreateForbiddenWordDto {
  @IsString()
  @MaxLength(100)
  word: string;
}
