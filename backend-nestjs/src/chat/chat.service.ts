import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenWord } from '../forbidden-words/entities/forbidden-word.entity';
import { Message, MessageType } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(ForbiddenWord)
    private readonly forbiddenWordsRepository: Repository<ForbiddenWord>,
  ) {}

  async ensureUserCanCommunicate(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }
    if (user.isBlacklisted) {
      throw new ForbiddenException('User is blacklisted');
    }
    return user;
  }

  async validateMessageContent(
    content: string,
    type: MessageType,
  ): Promise<{ blocked: boolean; matchedWords: string[] }> {
    if (type !== MessageType.TEXT) {
      return { blocked: false, matchedWords: [] };
    }

    const normalized = content.toLowerCase();
    const forbiddenWords = await this.forbiddenWordsRepository.find();
    const matchedWords = forbiddenWords
      .map((item) => item.word)
      .filter((word) => normalized.includes(word.toLowerCase()));

    return {
      blocked: matchedWords.length > 0,
      matchedWords,
    };
  }

  async createMessage(senderId: number, dto: SendMessageDto): Promise<Message> {
    const message = this.messagesRepository.create({
      senderId,
      receiverId: dto.receiverId,
      content: dto.content,
      type: dto.type,
      isRead: false,
    });

    return this.messagesRepository.save(message);
  }
}
