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
import { CreateQuickPhraseDto } from './dto/create-quick-phrase.dto';
import { UpdateQuickPhraseDto } from './dto/update-quick-phrase.dto';
import { QuickPhrasesService } from './quick-phrases.service';

@Controller('quick-phrases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class QuickPhrasesController {
  constructor(private readonly quickPhrasesService: QuickPhrasesService) {}

  @Post()
  create(@Body() createQuickPhraseDto: CreateQuickPhraseDto) {
    return this.quickPhrasesService.create(createQuickPhraseDto);
  }

  @Get()
  findAll() {
    return this.quickPhrasesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quickPhrasesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuickPhraseDto: UpdateQuickPhraseDto,
  ) {
    return this.quickPhrasesService.update(id, updateQuickPhraseDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.quickPhrasesService.remove(id);
  }
}
