import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendRegisterCodeDto } from './dto/send-register-code.dto';
import { UpsertMailConfigDto } from './dto/upsert-mail-config.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('auth/send-register-code')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendRegisterCode(@Body() dto: SendRegisterCodeDto) {
    return this.authService.sendRegisterCode(dto);
  }

  @Post('auth/register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Put('admin/mail-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  upsertMailConfig(@Body() dto: UpsertMailConfigDto) {
    return this.authService.upsertMailConfig(dto);
  }

  @Get('admin/mail-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getMailConfig() {
    return this.authService.getMailConfigMasked();
  }
}
