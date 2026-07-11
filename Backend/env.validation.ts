import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  APP_NAME: Joi.string().default('EduNexus'),
  APP_PORT: Joi.number().port().default(3000),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  APP_GLOBAL_PREFIX: Joi.string().default('api'),
  APP_DEFAULT_API_VERSION: Joi.string().default('1'),
  APP_CORS_ORIGINS: Joi.string().default('*'),
  APP_SHUTDOWN_TIMEOUT_MS: Joi.number().default(10000),

  // Database
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_POOL_MIN: Joi.number().default(2),
  DATABASE_POOL_MAX: Joi.number().default(10),
  DATABASE_CONNECT_TIMEOUT_MS: Joi.number().default(5000),
  DATABASE_QUERY_TIMEOUT_MS: Joi.number().default(15000),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),
  DATABASE_RETRY_ATTEMPTS: Joi.number().default(5),
  DATABASE_RETRY_DELAY_MS: Joi.number().default(2000),
  DATABASE_SLOW_QUERY_THRESHOLD_MS: Joi.number().default(500),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_TLS: Joi.boolean().default(false),
  REDIS_KEY_PREFIX: Joi.string().default('edunexus:'),

  // RabbitMQ
  RABBITMQ_URL: Joi.string().uri({ scheme: ['amqp', 'amqps'] }).required(),
  RABBITMQ_EXCHANGE: Joi.string().default('edunexus.exchange'),
  RABBITMQ_QUEUE_PREFIX: Joi.string().default('edunexus'),
  RABBITMQ_RECONNECT_TIME_MS: Joi.number().default(5000),
  RABBITMQ_HEARTBEAT_SEC: Joi.number().default(30),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('3600s'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  LOG_TO_FILE: Joi.boolean().default(false),
  LOG_DIR: Joi.string().default('logs'),

  // Cache
  CACHE_DEFAULT_TTL_SECONDS: Joi.number().default(300),
  CACHE_KEY_PREFIX: Joi.string().default('cache'),

  // Queue / Scheduler
  QUEUE_DEFAULT_MAX_ATTEMPTS: Joi.number().default(5),
  QUEUE_WORKER_PREFETCH: Joi.number().default(10),
  SCHEDULER_ENABLED: Joi.boolean().default(true),

  // Storage
  STORAGE_PROVIDER: Joi.string().valid('local', 'minio', 's3', 'azure', 'gcs').default('local'),
  STORAGE_LOCAL_BASE_DIR: Joi.string().default('./storage'),
  STORAGE_LOCAL_PUBLIC_URL: Joi.string().default('http://localhost:3000/static'),
  STORAGE_S3_BUCKET: Joi.string().allow('').optional(),
  STORAGE_S3_REGION: Joi.string().default('us-east-1'),
  STORAGE_S3_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  STORAGE_MINIO_BUCKET: Joi.string().allow('').optional(),
  STORAGE_MINIO_ENDPOINT: Joi.string().default('http://localhost:9000'),
  STORAGE_MINIO_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  STORAGE_MINIO_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  STORAGE_AZURE_ACCOUNT_NAME: Joi.string().allow('').optional(),
  STORAGE_AZURE_ACCOUNT_KEY: Joi.string().allow('').optional(),
  STORAGE_AZURE_CONTAINER_NAME: Joi.string().allow('').optional(),
  STORAGE_GCS_PROJECT_ID: Joi.string().allow('').optional(),
  STORAGE_GCS_BUCKET_NAME: Joi.string().allow('').optional(),
  STORAGE_GCS_CLIENT_EMAIL: Joi.string().allow('').optional(),
  STORAGE_GCS_PRIVATE_KEY: Joi.string().allow('').optional(),

  // Email
  EMAIL_FROM: Joi.string().default('no-reply@edunexus.local'),
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),

  // SMS
  SMS_DEFAULT_SENDER_ID: Joi.string().default('EduNexus'),

  // Push
  FIREBASE_PROJECT_ID: Joi.string().allow('').optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow('').optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().allow('').optional(),

  // Security
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  BCRYPT_ROUNDS: Joi.number().min(10).max(20).default(12),
  ENCRYPTION_KEY_HEX: Joi.string().allow('').optional(),
  CORS_ORIGINS: Joi.string().default('*'),
  ENABLE_HSTS: Joi.boolean().default(true),
  HSTS_MAX_AGE_SECONDS: Joi.number().default(31536000),
  ENABLE_CSP: Joi.boolean().default(true),
});
