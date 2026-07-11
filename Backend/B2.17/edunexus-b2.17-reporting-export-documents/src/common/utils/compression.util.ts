import { gzipSync, gunzipSync } from 'zlib';

/**
 * B2.17 addition — no equivalent existed. Uses Node's built-in
 * `zlib` (no new dependency) rather than a third-party archive
 * library, since the requirement is compressing a single generated
 * file for archival/storage, not building multi-file archives.
 */
export class CompressionUtil {
  static gzip(input: Buffer | string): Buffer {
    return gzipSync(Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf-8'));
  }

  static gunzip(input: Buffer): Buffer {
    return gunzipSync(input);
  }

  /** Rough compression ratio for logging/telemetry — not exact since gzip has per-stream overhead at tiny sizes. */
  static ratio(originalSize: number, compressedSize: number): number {
    return originalSize > 0 ? Number((1 - compressedSize / originalSize).toFixed(3)) : 0;
  }
}
