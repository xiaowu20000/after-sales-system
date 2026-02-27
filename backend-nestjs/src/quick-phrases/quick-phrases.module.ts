import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuickPhrase } from './entities/quick-phrase.entity';
import { QuickPhrasesController } from './quick-phrases.controller';
import { QuickPhrasesService } from './quick-phrases.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuickPhrase])],
  controllers: [QuickPhrasesController],
  providers: [QuickPhrasesService],
})
export class QuickPhrasesModule {}
