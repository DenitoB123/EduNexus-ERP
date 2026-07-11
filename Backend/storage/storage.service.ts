import { Injectable, OnModuleInit } from '@nestjs/common';
import { StorageFactory } from './storage.factory';
import { IStorageProvider } from '../interfaces/storage.interface';

@Injectable()
export class StorageService implements OnModuleInit {
  private provider!: IStorageProvider;

  constructor(private readonly storageFactory: StorageFactory) {}

  onModuleInit(): void {
    this.provider = this.storageFactory.create();
  }

  getProvider(): IStorageProvider {
    return this.provider;
  }
}
