import { MessageType } from '../../messages/entities/message.entity';

export class SendMessageDto {
  receiverId: number;
  content: string;
  type: MessageType;
}
