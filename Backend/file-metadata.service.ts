import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FileMetadata } from '../interfaces/storage.interface';

@Injectable()
export class FileMetadataService {
  constructor(private readonly storageService: StorageService) {}

  async getMetadata(key: string): Promise<FileMetadata> {
    return this.storageService.getProvider().getMetadata(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storageService.getProvider().exists(key);
  }
}
