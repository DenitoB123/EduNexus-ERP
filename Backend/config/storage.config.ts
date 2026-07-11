import { registerAs } from '@nestjs/config';
import { StorageProviderType } from '../interfaces/storage.interface';

export interface StorageConfig {
  provider: StorageProviderType;
  local: {
    baseDir: string;
    publicBaseUrl: string;
  };
  s3: {
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  minio: {
    bucket: string;
    endpoint: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  azure: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
  gcs: {
    projectId: string;
    bucketName: string;
    clientEmail: string;
    privateKey: string;
  };
}

export default registerAs('storage', (): StorageConfig => ({
  provider: (process.env.STORAGE_PROVIDER as StorageProviderType) ?? 'local',
  local: {
    baseDir: process.env.STORAGE_LOCAL_BASE_DIR ?? './storage',
    publicBaseUrl: process.env.STORAGE_LOCAL_PUBLIC_URL ?? 'http://localhost:3000/static',
  },
  s3: {
    bucket: process.env.STORAGE_S3_BUCKET ?? '',
    region: process.env.STORAGE_S3_REGION ?? 'us-east-1',
    accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
  },
  minio: {
    bucket: process.env.STORAGE_MINIO_BUCKET ?? '',
    endpoint: process.env.STORAGE_MINIO_ENDPOINT ?? 'http://localhost:9000',
    accessKeyId: process.env.STORAGE_MINIO_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_MINIO_SECRET_ACCESS_KEY,
  },
  azure: {
    accountName: process.env.STORAGE_AZURE_ACCOUNT_NAME ?? '',
    accountKey: process.env.STORAGE_AZURE_ACCOUNT_KEY ?? '',
    containerName: process.env.STORAGE_AZURE_CONTAINER_NAME ?? '',
  },
  gcs: {
    projectId: process.env.STORAGE_GCS_PROJECT_ID ?? '',
    bucketName: process.env.STORAGE_GCS_BUCKET_NAME ?? '',
    clientEmail: process.env.STORAGE_GCS_CLIENT_EMAIL ?? '',
    privateKey: (process.env.STORAGE_GCS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  },
}));
