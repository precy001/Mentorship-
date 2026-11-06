import {
  BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ProfileService } from './profile.service';

type UploadedImage = { buffer: Buffer; mimetype: string; size: number };

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file?: UploadedImage) {
    if (!file) throw new BadRequestException('Choose a profile picture to upload.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Choose a JPG, PNG, or WebP image.');
    }
    if (!file.buffer || file.size > 5 * 1024 * 1024) throw new BadRequestException('Your image must be 5 MB or smaller.');
    return this.profiles.uploadAvatar(user.id, file);
  }
}
