import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { IStorageProvider } from '../interfaces/storage.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { AzureStorageProvider } from './providers/azure-storage.provider';
import { GcsStorageProvider } from './providers/gcs-storage.provider';

@Injectable()
export class StorageFactory {
  constructor(private readonly configService: AppConfigService) {}

  create(): IStorageProvider {
    const { provider, local, s3, minio, azure, gcs } = this.configService.storage;

    switch (provider) {
      case 'local':
        return new LocalStorageProvider(local.baseDir, local.publicBaseUrl);

      case 's3':
        return new S3StorageProvider({
          bucket: s3.bucket,
          region: s3.region,
          accessKeyId: s3.accessKeyId,
          secretAccessKey: s3.secretAccessKey,
        });

      case 'minio':
        return new S3StorageProvider({
          bucket: minio.bucket,
          region: 'us-east-1',
          endpoint: minio.endpoint,
          accessKeyId: minio.accessKeyId,
          secretAccessKey: minio.secretAccessKey,
          forcePathStyle: true,
        });

      case 'azure':
        return new AzureStorageProvider({
          accountName: azure.accountName,
          accountKey: azure.accountKey,
          containerName: azure.containerName,
        });

      case 'gcs':
        return new GcsStorageProvider({
          projectId: gcs.projectId,
          bucketName: gcs.bucketName,
          clientEmail: gcs.clientEmail,
          privateKey: gcs.privateKey,
        });

      default:
        throw new Error(`Unsupported storage provider "${provider}"`);
    }
  }
}
