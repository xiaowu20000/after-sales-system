import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForbiddenWordsController } from './forbidden-words.controller';
import { ForbiddenWordsService } from './forbidden-words.service';
import { ForbiddenWord } from './entities/forbidden-word.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ForbiddenWord])],
  controllers: [ForbiddenWordsController],
  providers: [ForbiddenWordsService],
})
export class ForbiddenWordsModule {}
