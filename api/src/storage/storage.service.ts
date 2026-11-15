import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { extensionForImageType, MAX_IMAGE_BYTES, sniffImageType } from './image-validation';

export type UploadableImage = { buffer?: Buffer; mimetype?: string; size?: number };

/**
 * Single Supabase Storage integration used by the whole API.
 *
 * It was extracted from ProfileService so profile pictures and admin content images share
 * one upload path, one bucket configuration and one set of validation rules. The service-role
 * key is read from the server environment only and is never logged or returned.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {}

  private settings() {
    const url = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET') || 'profile-photos';
    return { url, key, bucket };
  }

  private encodePath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  private publicPrefix(): string | null {
    const { url, bucket } = this.settings();
    return url ? `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/` : null;
  }

  /** Uploads a validated image to `<folder>/<uuid>.<ext>` and returns its public URL. */
  async uploadImage(folder: string, file: UploadableImage, unavailableMessage = 'Image uploads are not configured. Please contact support.'): Promise<{ url: string; path: string }> {
    const { url, key, bucket } = this.settings();
    if (!url || !key) throw new ServiceUnavailableException(unavailableMessage);
    if (!file?.buffer || !file.buffer.length) throw new BadRequestException('Choose an image to upload.');
    if (file.buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException('Your image must be 5 MB or smaller.');
    const detected = sniffImageType(file.buffer);
    if (!detected) throw new BadRequestException('Choose a valid JPG, PNG, or WebP image.');

    const objectPath = `${folder}/${randomUUID()}.${extensionForImageType(detected)}`;
    const target = `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${this.encodePath(objectPath)}`;
    let response: Response;
    try {
      response = await fetch(target, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': detected, 'x-upsert': 'false' },
        body: new Uint8Array(file.buffer),
      });
    } catch (error) {
      this.logger.error(`Supabase Storage is unreachable: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException('The image could not be saved. Please try again later.');
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`Supabase Storage upload failed (${response.status}) for bucket "${bucket}": ${detail.slice(0, 500)}`);
      throw new ServiceUnavailableException('The image could not be saved. Please try again later.');
    }
    return { url: `${this.publicPrefix()}${this.encodePath(objectPath)}`, path: objectPath };
  }

  /** True only for URLs this service produced inside `<folder>/` of the configured bucket. */
  isManagedUrl(candidate: string, folder: string): boolean {
    const prefix = this.publicPrefix();
    if (!prefix) return false;
    return candidate.startsWith(`${prefix}${encodeURIComponent(folder)}/`) && !candidate.includes('..') && !/[?#]/.test(candidate);
  }

  /** Best-effort removal of an object previously uploaded through this service. Never throws. */
  async deleteByUrl(candidate: string | null | undefined): Promise<void> {
    if (!candidate) return;
    const { url, key, bucket } = this.settings();
    const prefix = this.publicPrefix();
    if (!url || !key || !prefix || !candidate.startsWith(prefix)) return;
    const objectPath = candidate.slice(prefix.length);
    try {
      const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`, {
        method: 'DELETE',
        headers: { apikey: key },
      });
      if (!response.ok) this.logger.warn(`Could not remove an unused stored image (${response.status}).`);
    } catch (error) {
      this.logger.warn(`Could not remove an unused stored image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
