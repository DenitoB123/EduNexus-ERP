# EduNexus — Backend Platform Foundation (Phase 1)

A multi-tenant School ERP SaaS backend. **This is the platform foundation only** —
no student, finance, library, or other ERP business modules are included yet.
Phase 1 delivers the tenant, identity, RBAC, and provisioning layer that every
future ERP module will be built on top of.

This codebase has been **fully built, migrated against a real PostgreSQL
instance, and exercised end-to-end** (registration → login → setup wizard →
invitations → RBAC enforcement → multi-tenant isolation) during development.

## Tech Stack
Node.js · Express.js · PostgreSQL · Sequelize ORM · JWT · RBAC · REST

## Folder Structure

```
backend/
├── app.js                      # Express entry point, route wiring, startup
├── config/
│   ├── env.js                  # Single source of truth for all env vars
│   └── database.js             # sequelize-cli compatible DB config
├── database/
│   ├── connection.js            # Sequelize instance singleton
│   ├── models/                  # One file per model + index.js loader
│   ├── migrations/               # 10 migrations, schools → audit_logs
│   └── seeders/                  # Global permission catalog + super_admin role
├── auth/                         # JWT, password hashing, sessions, auth flows
├── tenants/                      # Schools (tenant) + Campuses
├── users/                        # User CRUD, profile
├── roles/                        # Role CRUD, role-permission, user-role mgmt
├── permissions/                  # Read-only global permission catalog
├── setup-wizard/                 # 5-step tenant provisioning wizard
├── sessions/                      # Active session / device management
├── audit/                         # Append-only audit logging service + API
├── middleware/                    # authenticate, requirePermission, requireRole,
│                                   tenantScope, errorHandler, validate, rateLimiter
└── shared/                        # errors, utils, constants (roles, permissions)
```

Each business module follows **service → controller → routes** separation:
- `*.service.js` — business logic, the only layer that talks to Sequelize models
- `*.controller.js` — thin HTTP adapters (parse req, call service, shape response)
- `*.routes.js` — wires middleware (auth/tenant/permission) + controller per endpoint
- `*.validators.js` — express-validator chains

## Database Schema (10 tables)

| Table | Purpose |
|---|---|
| `schools` | Tenant root. Every business row traces back here via `school_id`. |
| `campuses` | Branches/campuses within a school. |
| `users` | School-scoped accounts (`school_id` is null only for platform super_admins). |
| `roles` | School-scoped roles (`school_id` null for the platform `super_admin` role). |
| `permissions` | Global platform catalog (`user.create`, `role.manage`, etc). No `school_id`. |
| `role_permissions` | Role ↔ Permission grants. |
| `user_roles` | User ↔ Role assignments (a user can hold multiple roles). |
| `sessions` | Refresh-token-backed login sessions, revocable per-device. |
| `invitations` | Pending email invitations with hashed, expiring tokens. |
| `audit_logs` | Append-only trail: login, logout, create, update, delete, role/permission change. |

**The multi-tenant rule is enforced in three layers:**
1. Every business table carries `school_id`.
2. `middleware/tenantScope.js` derives `req.scope.schoolId` strictly from the
   authenticated JWT (never from client-supplied input) and exposes
   `req.scope.withTenant(where)` to merge into every Sequelize query.
3. Every service function that reads/writes tenant data takes `schoolId`
   explicitly as a required parameter — there is no "global" query path for
   tenant-owned tables.

## Authentication & RBAC Flow

```
POST /auth/register-school   → creates School + owner User + bootstraps all
                                default roles/permissions (transactional)
POST /auth/login             → returns { accessToken, refreshToken, user,
                                roles, permissions }
POST /auth/refresh-token     → rotates a new accessToken from a valid session
POST /auth/logout            → revokes the session tied to the refresh token
POST /auth/forgot-password   → issues a hashed, time-limited reset token
POST /auth/reset-password    → consumes the token, revokes all sessions
POST /auth/invite-user       → (requires invitation.create) emails a one-time
                                token (logged to console in dev — no email
                                provider wired up in Phase 1)
POST /auth/accept-invitation → invitee sets name/password, account activates
```

JWT access token payload: `{ user_id, school_id, roles, permissions }`.
Permissions/roles are flattened and embedded at sign-time so most requests
authorize without a DB round-trip; tokens are short-lived (15m default) to
bound staleness, and `authenticate()` re-checks the user's live status on
every request as defense in depth.

**Middleware chain for a typical protected write:**
```js
router.post('/', authenticate, tenantScope, requirePermission('user.create'), validate, controller.createUser);
```

## Setup Wizard

5 steps, tracked on `schools.setup_step`: `school_info → structure → modules
→ roles → launch`. Step 0 (creating default roles/permissions) runs
automatically inside the registration transaction so the owner can log in
immediately; the remaining steps are driven by the frontend via:

```
GET  /setup-wizard/status
POST /setup-wizard/school-info
POST /setup-wizard/structure     # departments, classes, streams
POST /setup-wizard/modules       # activates ERP modules for later phases
POST /setup-wizard/roles         # add custom roles beyond the system defaults
POST /setup-wizard/launch        # marks school active, setup_completed = true
```

## Default Roles & Permissions

Seeded automatically per school on registration: `school_admin` (all
permissions), `principal`, `teacher`, `accountant`, `librarian`,
`receptionist`, `student`, `parent` — each with a sensible default permission
subset (see `shared/constants/role-permission-map.js`). A platform-wide
`super_admin` role (school_id = null) is seeded once via
`database/seeders/20250101001100-seed-super-admin-role.js` and bypasses all
permission/role checks.

## Running It

```bash
cp .env.example .env        # fill in DB credentials + JWT secrets
npm install
npx sequelize-cli db:create
npm run migrate
npm run seed
npm run dev                  # or: npm start
```

Health check: `GET /health`

## What Was Verified End-to-End

- ✅ Migrations run cleanly against PostgreSQL 16, in order, with FKs intact
- ✅ Permission catalog + platform `super_admin` role seed correctly
- ✅ `register-school` creates a tenant + owner + all default roles in one
  atomic transaction, owner can log in immediately
- ✅ Full setup wizard (all 5 steps) completes and flips the school to `active`
- ✅ Two independently registered schools cannot see each other's users,
  school records, or audit logs
- ✅ `requirePermission` correctly blocks a `teacher` role from `user.create`
  while allowing `user.read`
- ✅ Cross-tenant ID-guessing returns `404`, not a data leak
- ✅ A forged `x-school-id` header from a non-super-admin is ignored;
  tenant scope is derived only from the JWT
- ✅ Invite → accept-invitation flow issues a working session for the new user

## Explicitly Out of Scope for Phase 1

Students, academics records, finance, library, transport, hostel,
examinations, communication, and HR modules. The `setup-wizard` module
records *intent* to activate these (`schools.active_modules`) so later
phases can build against that signal, but no schema/routes for them exist yet.
