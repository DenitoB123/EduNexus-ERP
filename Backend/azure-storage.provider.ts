import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';
import {
  FileMetadata,
  IStorageProvider,
  SignedUrlOptions,
  UploadFileInput,
} from '../../interfaces/storage.interface';

export interface AzureProviderConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
}

export class AzureStorageProvider implements IStorageProvider {
  private readonly client: BlobServiceClient;
  private readonly credential: StorageSharedKeyCredential;

  constructor(private readonly config: AzureProviderConfig) {
    this.credential = new StorageSharedKeyCredential(config.accountName, config.accountKey);
    this.client = new BlobServiceClient(
      `https://${config.accountName}.blob.core.windows.net`,
      this.credential,
    );
  }

  private containerClient() {
    return this.client.getContainerClient(this.config.containerName);
  }

  async upload(input: UploadFileInput): Promise<FileMetadata> {
    const blockBlobClient = this.containerClient().getBlockBlobClient(input.key);
    await blockBlobClient.uploadData(input.buffer, {
      blobHTTPHeaders: { blobContentType: input.contentType },
      metadata: input.metadata,
    });

    return this.getMetadata(input.key);
  }

  async download(key: string): Promise<Buffer> {
    const blockBlobClient = this.containerClient().getBlockBlobClient(key);
    return blockBlobClient.downloadToBuffer();
  }

  async delete(key: string): Promise<void> {
    await this.containerClient().getBlockBlobClient(key).deleteIfExists();
  }

  async exists(key: string): Promise<boolean> {
    return this.containerClient().getBlockBlobClient(key).exists();
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const props = await this.containerClient().getBlockBlobClient(key).getProperties();
    return {
      key,
      size: props.contentLength ?? 0,
      contentType: props.contentType ?? 'application/octet-stream',
      lastModified: props.lastModified ?? new Date(),
      metadata: props.metadata,
    };
  }

  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    const blockBlobClient = this.containerClient().getBlockBlobClient(key);
    const expiresOn = new Date(Date.now() + options.expiresInSeconds * 1000);

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.config.containerName,
        blobName: key,
        permissions: BlobSASPermissions.parse(options.operation === 'put' ? 'racw' : 'r'),
        protocol: SASProtocol.Https,
        expiresOn,
      },
      this.credential,
    );

    return `${blockBlobClient.url}?${sas.toString()}`;
  }
}
