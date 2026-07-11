import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';
import { SignedUrlOptions } from '../interfaces/storage.interface';

@Injectable()
export class SignedUrlService {
  constructor(private readonly storageService: StorageService) {}

  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    return this.storageService.getProvider().getSignedUrl(key, options);
  }
}
