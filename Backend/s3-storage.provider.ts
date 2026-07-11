import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  FileMetadata,
  IStorageProvider,
  SignedUrlOptions,
  UploadFileInput,
} from '../../interfaces/storage.interface';

export interface S3ProviderConfig {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client;

  constructor(private readonly config: S3ProviderConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
          : undefined,
    });
  }

  async upload(input: UploadFileInput): Promise<FileMetadata> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );

    return this.getMetadata(input.key);
  }

  async download(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    const body = result.Body as unknown as { transformToByteArray: () => Promise<Uint8Array> };
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );

    return {
      key,
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? 'application/octet-stream',
      lastModified: result.LastModified ?? new Date(),
      metadata: result.Metadata,
    };
  }

  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    const command =
      options.operation === 'put'
        ? new PutObjectCommand({ Bucket: this.config.bucket, Key: key })
        : new GetObjectCommand({ Bucket: this.config.bucket, Key: key });

    return getSignedUrl(this.client, command, { expiresIn: options.expiresInSeconds });
  }
}
