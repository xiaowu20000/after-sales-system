import { IsEnum, IsInt, IsString } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsInt()
  senderId: number;

  @IsInt()
  receiverId: number;
}
