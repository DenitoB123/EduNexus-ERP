import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';

@Injectable()
export class DownloadService {
  constructor(private readonly storageService: StorageService) {}

  async download(key: string): Promise<Buffer> {
    return this.storageService.getProvider().download(key);
  }
}
