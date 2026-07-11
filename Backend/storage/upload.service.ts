import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FileMetadata, UploadFileInput } from '../interfaces/storage.interface';

@Injectable()
export class UploadService {
  constructor(private readonly storageService: StorageService) {}

  async upload(input: UploadFileInput): Promise<FileMetadata> {
    if (!input.key || input.buffer.length === 0) {
      throw new Error('Upload requires a non-empty key and buffer');
    }
    return this.storageService.getProvider().upload(input);
  }
}
