import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendRegisterCodeDto } from './dto/send-register-code.dto';
import { UpsertMailConfigDto } from './dto/upsert-mail-config.dto';
import { EmailCode } from './entities/email-code.entity';
import { MailConfig } from './entities/mail-config.entity';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(EmailCode)
    private readonly emailCodesRepository: Repository<EmailCode>,
    @InjectRepository(MailConfig)
    private readonly mailConfigRepository: Repository<MailConfig>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultAdmin();
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email.toLowerCase() })
      .getOne();
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  async sendRegisterCode(dto: SendRegisterCodeDto) {
    const email = dto.email.toLowerCase();
    const exists = await this.usersRepository.findOne({ where: { email } });
    if (exists) {
      throw new BadRequestException('Email already registered');
    }

    const mailConfig = await this.getMailConfigRaw();
    const code = `${Math.floor(100000 + Math.random() * 900000)}`;

    const emailCode = this.emailCodesRepository.create({
      email,
      code,
      purpose: 'REGISTER',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
    });
    await this.emailCodesRepository.save(emailCode);

    const transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: {
        user: mailConfig.user,
        pass: mailConfig.pass,
      },
    });

    await transporter.sendMail({
      from: mailConfig.fromEmail,
      to: email,
      subject: 'After Sales Register Code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return { success: true };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const exists = await this.usersRepository.findOne({ where: { email } });
    if (exists) {
      throw new BadRequestException('Email already registered');
    }

    const code = await this.emailCodesRepository.findOne({
      where: { email, code: dto.code, purpose: 'REGISTER', used: false },
      order: { id: 'DESC' },
    });
    if (!code) {
      throw new BadRequestException('Invalid code');
    }
    if (new Date(code.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('Code expired');
    }

    code.used = true;
    await this.emailCodesRepository.save(code);

    const passwordHash = await hash(dto.password, 10);
    const user = this.usersRepository.create({
      email,
      passwordHash,
      role: UserRole.USER,
      isBlacklisted: false,
    });
    const saved = await this.usersRepository.save(user);
    return this.buildAuthResponse(saved);
  }

  async upsertMailConfig(dto: UpsertMailConfigDto) {
    const config = await this.mailConfigRepository.findOne({ where: { id: 1 } });
    const pass = dto.pass || config?.pass || '';
    if (!pass) {
      throw new BadRequestException('SMTP auth code is required');
    }
    const merged = this.mailConfigRepository.merge(config ?? new MailConfig(), {
      id: 1,
      ...dto,
      pass,
    });
    await this.mailConfigRepository.save(merged);
    return this.getMailConfigMasked();
  }

  async getMailConfigMasked() {
    const config = await this.getMailConfigRaw();
    return {
      id: config.id,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      fromEmail: config.fromEmail,
      pass: config.pass ? '******' : '',
    };
  }

  async getMailConfigRaw() {
    const config = await this.mailConfigRepository.findOne({ where: { id: 1 } });
    if (!config) {
      throw new NotFoundException('Mail config not set');
    }
    return config;
  }

  signToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      role: user.role,
      email: user.email,
    });
  }

  private buildAuthResponse(user: User) {
    return {
      token: this.signToken(user),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isBlacklisted: user.isBlacklisted,
      },
    };
  }

  private async ensureDefaultAdmin() {
    const adminCount = await this.usersRepository.count({
      where: { role: UserRole.ADMIN },
    });
    if (adminCount > 0) {
      return;
    }

    const email = 'admin@example.com';
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      return;
    }
    const passwordHash = await hash('Admin123456', 10);
    const admin = this.usersRepository.create({
      email,
      passwordHash,
      role: UserRole.ADMIN,
      isBlacklisted: false,
    });
    await this.usersRepository.save(admin);
  }
}
