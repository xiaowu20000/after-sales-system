import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateForbiddenWordDto } from './dto/create-forbidden-word.dto';
import { UpdateForbiddenWordDto } from './dto/update-forbidden-word.dto';
import { ForbiddenWordsService } from './forbidden-words.service';

@Controller('forbidden-words')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ForbiddenWordsController {
  constructor(private readonly forbiddenWordsService: ForbiddenWordsService) {}

  @Post()
  create(@Body() createForbiddenWordDto: CreateForbiddenWordDto) {
    return this.forbiddenWordsService.create(createForbiddenWordDto);
  }

  @Get()
  findAll() {
    return this.forbiddenWordsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.forbiddenWordsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateForbiddenWordDto: UpdateForbiddenWordDto,
  ) {
    return this.forbiddenWordsService.update(id, updateForbiddenWordDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.forbiddenWordsService.remove(id);
  }
}
