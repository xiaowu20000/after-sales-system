import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { Message } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const message = this.messagesRepository.create(createMessageDto);
    return this.messagesRepository.save(message);
  }

  async findAllForUser(userId: number, query: QueryMessagesDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const qb = this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where('message.senderId = :userId OR message.receiverId = :userId', {
        userId,
      });

    if (query.peerId) {
      qb.andWhere(
        '(message.senderId = :peerId OR message.receiverId = :peerId)',
        { peerId: query.peerId },
      );
    }

    const [items, total] = await qb
      .orderBy('message.id', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    if (query.peerId) {
      await this.messagesRepository
        .createQueryBuilder()
        .update(Message)
        .set({ isRead: true })
        .where('receiverId = :userId', { userId })
        .andWhere('senderId = :peerId', { peerId: query.peerId })
        .andWhere('isRead = :isRead', { isRead: false })
        .execute();
    }

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findConversations(userId: number, query: QueryMessagesDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const messages = await this.messagesRepository
      .createQueryBuilder('message')
      .where('message.senderId = :userId OR message.receiverId = :userId', {
        userId,
      })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    const byPeer = new Map<
      number,
      {
        peerId: number;
        lastMessage: Message;
        unreadCount: number;
      }
    >();

    for (const message of messages) {
      const peerId =
        Number(message.senderId) === userId
          ? Number(message.receiverId)
          : Number(message.senderId);
      if (!byPeer.has(peerId)) {
        byPeer.set(peerId, {
          peerId,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      if (Number(message.receiverId) === userId && !message.isRead) {
        const conv = byPeer.get(peerId)!;
        conv.unreadCount += 1;
      }
    }

    const all = Array.from(byPeer.values());
    const total = all.length;
    const items = all.slice(skip, skip + pageSize);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(id: number): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: ['sender', 'receiver'],
    });
    if (!message) {
      throw new NotFoundException(`Message #${id} not found`);
    }
    return message;
  }

  async findOneForUser(id: number, userId: number): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: [{ id, senderId: userId }, { id, receiverId: userId }],
      relations: ['sender', 'receiver'],
    });
    if (!message) {
      throw new NotFoundException(`Message #${id} not found`);
    }
    return message;
  }

  async update(id: number, updateMessageDto: UpdateMessageDto): Promise<Message> {
    const message = await this.findOne(id);
    const merged = this.messagesRepository.merge(message, updateMessageDto);
    return this.messagesRepository.save(merged);
  }

  async remove(id: number): Promise<void> {
    const message = await this.findOne(id);
    await this.messagesRepository.remove(message);
  }
}
