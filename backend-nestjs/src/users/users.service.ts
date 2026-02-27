import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      email: createUserDto.email.toLowerCase(),
      passwordHash: await hash(createUserDto.password, 10),
      role: createUserDto.role,
      isBlacklisted: createUserDto.isBlacklisted ?? false,
    });
    const saved = await this.usersRepository.save(user);
    return this.sanitize(saved);
  }

  async findAll(): Promise<User[]> {
    const users = await this.usersRepository.find({ order: { id: 'DESC' } });
    return users.map((item) => this.sanitize(item));
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return this.sanitize(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    if (updateUserDto.email) {
      user.email = updateUserDto.email.toLowerCase();
    }
    if (updateUserDto.password) {
      user.passwordHash = await hash(updateUserDto.password, 10);
    }
    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }
    if (typeof updateUserDto.isBlacklisted === 'boolean') {
      user.isBlacklisted = updateUserDto.isBlacklisted;
    }

    const saved = await this.usersRepository.save(user);
    return this.sanitize(saved);
  }

  async remove(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    await this.usersRepository.remove(user);
  }

  private sanitize(user: User): User {
    const next = { ...user };
    delete (next as any).passwordHash;
    return next as User;
  }
}
