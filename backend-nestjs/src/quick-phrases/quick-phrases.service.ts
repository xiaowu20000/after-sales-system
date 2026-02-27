import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuickPhraseDto } from './dto/create-quick-phrase.dto';
import { UpdateQuickPhraseDto } from './dto/update-quick-phrase.dto';
import { QuickPhrase } from './entities/quick-phrase.entity';

@Injectable()
export class QuickPhrasesService {
  constructor(
    @InjectRepository(QuickPhrase)
    private readonly quickPhrasesRepository: Repository<QuickPhrase>,
  ) {}

  async create(createQuickPhraseDto: CreateQuickPhraseDto): Promise<QuickPhrase> {
    const quickPhrase = this.quickPhrasesRepository.create(createQuickPhraseDto);
    return this.quickPhrasesRepository.save(quickPhrase);
  }

  async findAll(): Promise<QuickPhrase[]> {
    return this.quickPhrasesRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<QuickPhrase> {
    const quickPhrase = await this.quickPhrasesRepository.findOne({
      where: { id },
    });
    if (!quickPhrase) {
      throw new NotFoundException(`QuickPhrase #${id} not found`);
    }
    return quickPhrase;
  }

  async update(
    id: number,
    updateQuickPhraseDto: UpdateQuickPhraseDto,
  ): Promise<QuickPhrase> {
    const quickPhrase = await this.findOne(id);
    const merged = this.quickPhrasesRepository.merge(
      quickPhrase,
      updateQuickPhraseDto,
    );
    return this.quickPhrasesRepository.save(merged);
  }

  async remove(id: number): Promise<void> {
    const quickPhrase = await this.findOne(id);
    await this.quickPhrasesRepository.remove(quickPhrase);
  }
}
