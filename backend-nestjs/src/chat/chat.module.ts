import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ForbiddenWord } from '../forbidden-words/entities/forbidden-word.entity';
import { Message } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Message, ForbiddenWord]), AuthModule],
  controllers: [UploadController],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
