# EduNexus Backend — Milestone 1.1: Core Foundation

Enterprise-grade NestJS foundation layer for the EduNexus education platform.

---

## Project Structure

```
edunexus-backend/
├── src/
│   ├── main.ts                          # Bootstrap entry point
│   ├── app.module.ts                    # Root module
│   │
│   ├── config/
│   │   ├── configuration.ts             # Typed config factory
│   │   ├── config.module.ts             # Global ConfigModule wrapper
│   │   └── config.service.ts            # Typed AppConfigService
│   │
│   ├── database/
│   │   ├── prisma.service.ts            # PrismaClient + lifecycle + helpers
│   │   └── prisma.module.ts             # Global DatabaseModule
│   │
│   ├── common/
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts # HttpException → standard response
│   │   │   ├── all-exceptions.filter.ts # Catch-all + Prisma error mapping
│   │   │   └── index.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts   # Per-request HTTP logging
│   │   │   ├── transform.interceptor.ts # Wraps all 2xx in SuccessResponse
│   │   │   └── index.ts
│   │   ├── guards/
│   │   │   └── placeholder.guard.ts    # Auth guards added in 1.2
│   │   ├── decorators/
│   │   │   └── index.ts
│   │   └── logger/
│   │       ├── logger.service.ts        # Winston structured logger
│   │       └── logger.module.ts         # Global LoggerModule
│   │
│   └── core/
│       └── core.module.ts              # Infrastructure hub module
│
├── prisma/
│   └── schema.prisma                   # Base schema (AuditLog, HealthPing)
│
├── .env                                # Local env (not committed)
├── .env.example                        # Env template (committed)
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment file
cp .env.example .env

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run migrations
npm run prisma:migrate

# 5. Start in dev mode
npm run start:dev
```

API is available at: `http://localhost:3000/api`

---

## Global Response Shapes

### Success
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/..."
}
```

### Error
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "path": "/api/v1/...",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Architecture Notes

- **Global modules**: `AppConfigModule`, `DatabaseModule`, `LoggerModule` — injected platform-wide
- **Filters order**: `AllExceptionsFilter` (catch-all) → `HttpExceptionFilter` (specific)
- **Prisma errors**: P2002 (conflict), P2025 (not found), P2003/P2014 (constraint) are mapped to correct HTTP codes
- **Log rotation**: daily files, 14-day retention, separate error log
- **Versioning**: URI-based (`/api/v1/...`), defaultVersion from `.env`
- **Path aliases**: `@config/*`, `@database/*`, `@common/*`, `@core/*`

---

## Milestone Roadmap

| Milestone | Module |
|-----------|--------|
| **1.1** | ✅ Core Foundation (this) |
| 1.2 | Auth (JWT, refresh tokens, guards) |
| 1.3 | Users + Roles + RBAC |
| 1.4 | Multi-tenancy layer |
| 1.5 | Health checks + metrics |
| 2.x | LMS domain modules |
