import { Storage } from '@google-cloud/storage';
import {
  FileMetadata,
  IStorageProvider,
  SignedUrlOptions,
  UploadFileInput,
} from '../../interfaces/storage.interface';

export interface GcsProviderConfig {
  projectId: string;
  bucketName: string;
  clientEmail: string;
  privateKey: string;
}

export class GcsStorageProvider implements IStorageProvider {
  private readonly storage: Storage;

  constructor(private readonly config: GcsProviderConfig) {
    this.storage = new Storage({
      projectId: config.projectId,
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
    });
  }

  private bucket() {
    return this.storage.bucket(this.config.bucketName);
  }

  async upload(input: UploadFileInput): Promise<FileMetadata> {
    const file = this.bucket().file(input.key);
    await file.save(input.buffer, {
      contentType: input.contentType,
      metadata: { metadata: input.metadata },
    });

    return this.getMetadata(input.key);
  }

  async download(key: string): Promise<Buffer> {
    const [buffer] = await this.bucket().file(key).download();
    return buffer;
  }

  async delete(key: string): Promise<void> {
    await this.bucket().file(key).delete({ ignoreNotFound: true });
  }

  async exists(key: string): Promise<boolean> {
    const [exists] = await this.bucket().file(key).exists();
    return exists;
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const [metadata] = await this.bucket().file(key).getMetadata();
    return {
      key,
      size: Number(metadata.size ?? 0),
      contentType: metadata.contentType ?? 'application/octet-stream',
      lastModified: metadata.updated ? new Date(metadata.updated) : new Date(),
      metadata: metadata.metadata as Record<string, string> | undefined,
    };
  }

  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    const [url] = await this.bucket().file(key).getSignedUrl({
      action: options.operation === 'put' ? 'write' : 'read',
      expires: Date.now() + options.expiresInSeconds * 1000,
    });
    return url;
  }
}
