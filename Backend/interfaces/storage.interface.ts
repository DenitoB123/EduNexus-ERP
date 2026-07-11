export interface UploadFileInput {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
  expiresInSeconds: number;
  operation: 'get' | 'put';
}

export interface IStorageProvider {
  upload(input: UploadFileInput): Promise<FileMetadata>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<FileMetadata>;
  getSignedUrl(key: string, options: SignedUrlOptions): Promise<string>;
}

export type StorageProviderType = 'local' | 'minio' | 's3' | 'azure' | 'gcs';
