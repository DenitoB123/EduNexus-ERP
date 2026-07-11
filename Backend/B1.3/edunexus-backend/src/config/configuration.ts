export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    host: process.env.APP_HOST ?? '0.0.0.0',
    apiPrefix: process.env.API_PREFIX ?? 'api',
    apiVersion: process.env.API_VERSION ?? 'v1',
    corsOrigins: process.env.CORS_ORIGINS ?? 'http://localhost:3000',
    corsMethods:
      process.env.CORS_METHODS ??
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  },

  database: {
    url: process.env.DATABASE_URL,
    poolMin: parseInt(process.env.DATABASE_POOL_MIN ?? '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10),
    connectionTimeout: parseInt(
      process.env.DATABASE_CONNECTION_TIMEOUT ?? '30000',
      10,
    ),
  },

  logging: {
    level: process.env.LOG_LEVEL ?? 'debug',
    dir: process.env.LOG_DIR ?? 'logs',
    maxFiles: process.env.LOG_MAX_FILES ?? '14d',
    maxSize: process.env.LOG_MAX_SIZE ?? '20m',
  },

  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    encryptionKey: process.env.ENCRYPTION_KEY,
    hmacSecret: process.env.HMAC_SECRET ?? process.env.JWT_SECRET,
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },

  // ── Milestone 1.3 ──────────────────────────────────────────────────────────

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 's3',
    endpoint: process.env.S3_ENDPOINT, // set for MinIO / non-AWS S3-compatible
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'edunexus-files',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    maxFileSizeBytes: parseInt(
      process.env.MAX_FILE_SIZE_BYTES ?? `${25 * 1024 * 1024}`, // 25 MB
      10,
    ),
    signedUrlExpirySeconds: parseInt(
      process.env.SIGNED_URL_EXPIRY_SECONDS ?? '900', // 15 min
      10,
    ),
  },

  jobs: {
    defaultAttempts: parseInt(process.env.JOB_DEFAULT_ATTEMPTS ?? '3', 10),
    defaultBackoffMs: parseInt(process.env.JOB_DEFAULT_BACKOFF_MS ?? '5000', 10),
    removeOnComplete: parseInt(process.env.JOB_REMOVE_ON_COMPLETE ?? '500', 10),
    removeOnFail: parseInt(process.env.JOB_REMOVE_ON_FAIL ?? '1000', 10),
  },
});
