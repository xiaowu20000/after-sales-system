import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateForbiddenWordDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  word?: string;
}
