import {
  ConnectedSocket,
  ForbiddenException,
  HttpException,
  MessageBody,
  NotFoundException,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MessageType } from '../messages/entities/message.entity';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly userSockets = new Map<number, Set<string>>();
  private readonly socketUserMap = new Map<string, number>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const userId = this.extractUserIdFromToken(client);

    if (!userId) {
      client.emit('chat_error', {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid token',
      });
      client.disconnect();
      return;
    }

    try {
      await this.chatService.ensureUserCanCommunicate(userId);
      this.bindSocket(userId, client.id);
      client.emit('connected', { userId });
    } catch (error) {
      client.emit('chat_error', this.toChatErrorPayload(error));
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = this.socketUserMap.get(client.id);
    if (!userId) {
      return;
    }

    this.socketUserMap.delete(client.id);
    const sockets = this.userSockets.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(client.id);
    if (sockets.size === 0) {
      this.userSockets.delete(userId);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const senderId = this.socketUserMap.get(client.id);
    if (!senderId) {
      client.emit('chat_error', { message: 'User not authenticated' });
      return;
    }

    const dto = this.normalizePayload(payload);
    if (!dto) {
      client.emit('chat_error', { message: 'Invalid message payload' });
      return;
    }

    try {
      await this.chatService.ensureUserCanCommunicate(senderId);
      await this.chatService.ensureUserCanCommunicate(dto.receiverId);

      const filterResult = await this.chatService.validateMessageContent(
        dto.content,
        dto.type,
      );
      if (filterResult.blocked) {
        client.emit('message_blocked', {
          code: 'FORBIDDEN_WORD',
          message: 'Message contains forbidden words',
          matchedWords: filterResult.matchedWords,
        });
        return;
      }

      const saved = await this.chatService.createMessage(senderId, dto);
      const messagePayload = {
        id: saved.id,
        senderId: saved.senderId,
        receiverId: saved.receiverId,
        content: saved.content,
        type: saved.type,
        createdAt: saved.createdAt,
      };

      client.emit('new_message', messagePayload);
      this.emitToUser(dto.receiverId, 'new_message', messagePayload);
    } catch (error) {
      client.emit('chat_error', this.toChatErrorPayload(error));
    }
  }

  private emitToUser(userId: number, event: string, payload: unknown): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets) {
      return;
    }
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  private bindSocket(userId: number, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set<string>());
    }
    this.userSockets.get(userId)?.add(socketId);
    this.socketUserMap.set(socketId, userId);
  }

  private extractUserIdFromToken(client: Socket): number | null {
    const token =
      client.handshake.auth?.token ?? client.handshake.query?.token ?? null;
    if (!token || typeof token !== 'string') {
      return null;
    }
    try {
      const payload = this.jwtService.verify(token);
      const value = Number(payload?.sub);
      if (!Number.isInteger(value) || value <= 0) {
        return null;
      }
      return value;
    } catch (error) {
      return null;
    }
  }

  private normalizePayload(payload: SendMessageDto): SendMessageDto | null {
    const receiverId = Number(payload?.receiverId);
    const content = typeof payload?.content === 'string' ? payload.content : '';
    const type =
      payload?.type === MessageType.IMAGE ? MessageType.IMAGE : MessageType.TEXT;

    if (!Number.isInteger(receiverId) || receiverId <= 0 || !content.trim()) {
      return null;
    }

    return {
      receiverId,
      content: content.trim(),
      type,
    };
  }

  private toChatErrorPayload(error: unknown): { code: string; message: string } {
    if (error instanceof ForbiddenException) {
      return { code: 'BLACKLISTED', message: 'You have been blacklisted' };
    }
    if (error instanceof NotFoundException) {
      return { code: 'USER_NOT_FOUND', message: 'User not found' };
    }
    if (error instanceof HttpException) {
      return { code: 'CHAT_REJECTED', message: error.message };
    }
    return { code: 'CHAT_REJECTED', message: 'Message rejected' };
  }
}
