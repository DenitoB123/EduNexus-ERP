import { promises as fs } from 'fs';
import * as path from 'path';
import {
  FileMetadata,
  IStorageProvider,
  SignedUrlOptions,
  UploadFileInput,
} from '../../interfaces/storage.interface';

export class LocalStorageProvider implements IStorageProvider {
  constructor(
    private readonly baseDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  private resolvePath(key: string): string {
    const resolved = path.normalize(path.join(this.baseDir, key));
    if (!resolved.startsWith(path.normalize(this.baseDir))) {
      throw new Error('Resolved storage path escapes the base directory');
    }
    return resolved;
  }

  async upload(input: UploadFileInput): Promise<FileMetadata> {
    const fullPath = this.resolvePath(input.key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, input.buffer);

    return this.getMetadata(input.key);
  }

  async download(key: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolvePath(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const stats = await fs.stat(this.resolvePath(key));
    return {
      key,
      size: stats.size,
      contentType: 'application/octet-stream',
      lastModified: stats.mtime,
    };
  }

  async getSignedUrl(key: string, _options: SignedUrlOptions): Promise<string> {
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
}
