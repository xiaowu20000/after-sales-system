import {
  BadRequestException,
  Controller,
  Delete,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdir, readdir, rm } from 'fs/promises';
import { diskStorage } from 'multer';
import { basename, extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ChatService } from './chat.service';

function getDateFolder(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateFolder(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly chatService: ChatService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: async (_, __, cb) => {
          try {
            const folder = getDateFolder();
            const target = join(process.cwd(), 'uploads', folder);
            await mkdir(target, { recursive: true });
            cb(null, target);
          } catch (error) {
            cb(error as Error, '');
          }
        },
        filename: (_, file, cb) => {
          const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${suffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image uploads are allowed') as any, false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = Number(req.user?.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('Invalid user');
    }

    await this.chatService.ensureUserCanCommunicate(userId);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const dateFolder = basename(file.destination || '') || getDateFolder();
    return {
      url: `${baseUrl}/uploads/${dateFolder}/${file.filename}`,
    };
  }

  @Delete('upload/cleanup')
  @Roles(UserRole.ADMIN)
  async cleanupUploads(@Query('days') daysRaw?: string) {
    const days = Number(daysRaw ?? 7);
    if (!Number.isInteger(days) || days <= 0) {
      throw new BadRequestException('days must be a positive integer');
    }

    const baseDir = join(process.cwd(), 'uploads');
    const entries = await readdir(baseDir, { withFileTypes: true }).catch(() => []);
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    let removedFolders = 0;
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const folderDate = parseDateFolder(entry.name);
      if (!folderDate) {
        continue;
      }

      if (folderDate.getTime() >= cutoffTime) {
        continue;
      }

      await rm(join(baseDir, entry.name), { recursive: true, force: true });
      removedFolders += 1;
    }

    return {
      days,
      removedFolders,
    };
  }
}
