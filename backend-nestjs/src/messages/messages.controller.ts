import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get('conversations')
  findConversations(@Req() req: any, @Query() query: QueryMessagesDto) {
    return this.messagesService.findConversations(Number(req.user.userId), query);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: QueryMessagesDto) {
    return this.messagesService.findAllForUser(Number(req.user.userId), query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.messagesService.findOneForUser(id, Number(req.user.userId));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.messagesService.update(id, updateMessageDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.messagesService.remove(id);
  }

  @Delete('peer/:peerId')
  @Roles(UserRole.ADMIN)
  removeByPeer(@Req() req: any, @Param('peerId', ParseIntPipe) peerId: number) {
    return this.messagesService.removeByPeerId(Number(req.user.userId), peerId);
  }
}
