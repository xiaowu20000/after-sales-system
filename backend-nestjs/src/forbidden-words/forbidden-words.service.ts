import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateForbiddenWordDto } from './dto/create-forbidden-word.dto';
import { UpdateForbiddenWordDto } from './dto/update-forbidden-word.dto';
import { ForbiddenWord } from './entities/forbidden-word.entity';

@Injectable()
export class ForbiddenWordsService {
  constructor(
    @InjectRepository(ForbiddenWord)
    private readonly forbiddenWordsRepository: Repository<ForbiddenWord>,
  ) {}

  async create(
    createForbiddenWordDto: CreateForbiddenWordDto,
  ): Promise<ForbiddenWord> {
    const forbiddenWord = this.forbiddenWordsRepository.create(
      createForbiddenWordDto,
    );
    return this.forbiddenWordsRepository.save(forbiddenWord);
  }

  async findAll(): Promise<ForbiddenWord[]> {
    return this.forbiddenWordsRepository.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<ForbiddenWord> {
    const forbiddenWord = await this.forbiddenWordsRepository.findOne({
      where: { id },
    });
    if (!forbiddenWord) {
      throw new NotFoundException(`ForbiddenWord #${id} not found`);
    }
    return forbiddenWord;
  }

  async update(
    id: number,
    updateForbiddenWordDto: UpdateForbiddenWordDto,
  ): Promise<ForbiddenWord> {
    const forbiddenWord = await this.findOne(id);
    const merged = this.forbiddenWordsRepository.merge(
      forbiddenWord,
      updateForbiddenWordDto,
    );
    return this.forbiddenWordsRepository.save(merged);
  }

  async remove(id: number): Promise<void> {
    const forbiddenWord = await this.findOne(id);
    await this.forbiddenWordsRepository.remove(forbiddenWord);
  }
}
