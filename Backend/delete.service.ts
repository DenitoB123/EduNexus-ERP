import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';

@Injectable()
export class DeleteService {
  constructor(private readonly storageService: StorageService) {}

  async delete(key: string): Promise<void> {
    await this.storageService.getProvider().delete(key);
  }
}
