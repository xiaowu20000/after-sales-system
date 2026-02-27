import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsInt()
  senderId?: number;

  @IsOptional()
  @IsInt()
  receiverId?: number;
}
