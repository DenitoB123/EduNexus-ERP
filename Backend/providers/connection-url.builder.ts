import { DatabaseConfig } from '../../config/database.config';

export function buildConnectionUrl(config: DatabaseConfig): string {
  const url = new URL(config.url);

  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', String(config.pool.max));
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', String(Math.ceil(config.connectTimeoutMs / 1000)));
  }
  if (config.ssl.enabled && !url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', config.ssl.rejectUnauthorized ? 'require' : 'no-verify');
  }

  return url.toString();
}
