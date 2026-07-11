import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';
import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
  let baseDir: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'edunexus-storage-'));
    provider = new LocalStorageProvider(baseDir, 'http://localhost/static');
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('uploads and reports metadata for a file', async () => {
    const metadata = await provider.upload({
      key: 'docs/test.txt',
      buffer: Buffer.from('hello world'),
      contentType: 'text/plain',
    });

    expect(metadata.key).toBe('docs/test.txt');
    expect(metadata.size).toBe(11);
  });

  it('downloads previously uploaded content', async () => {
    await provider.upload({ key: 'a.txt', buffer: Buffer.from('content'), contentType: 'text/plain' });
    const buffer = await provider.download('a.txt');
    expect(buffer.toString()).toBe('content');
  });

  it('reports exists() correctly before and after delete', async () => {
    await provider.upload({ key: 'b.txt', buffer: Buffer.from('x'), contentType: 'text/plain' });
    expect(await provider.exists('b.txt')).toBe(true);

    await provider.delete('b.txt');
    expect(await provider.exists('b.txt')).toBe(false);
  });

  it('rejects keys that attempt to escape the base directory', async () => {
    await expect(
      provider.upload({ key: '../../etc/passwd', buffer: Buffer.from('x'), contentType: 'text/plain' }),
    ).rejects.toThrow(/escapes the base directory/);
  });

  it('builds a signed URL pointing at the public base URL', async () => {
    const url = await provider.getSignedUrl('a.txt', { expiresInSeconds: 60, operation: 'get' });
    expect(url).toBe('http://localhost/static/a.txt');
  });
});
