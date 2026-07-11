const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const db = require('./database/models');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./auth/auth.routes');
const sessionRoutes = require('./sessions/session.routes');
const tenantRoutes = require('./tenants/tenant.routes');
const userRoutes = require('./users/user.routes');
const roleRoutes = require('./roles/role.routes');
const permissionRoutes = require('./permissions/permission.routes');
const setupWizardRoutes = require('./setup-wizard/setup-wizard.routes');
const auditRoutes = require('./audit/audit.routes');

const app = express();

// ---- Global middleware ----
app.use(helmet());
app.use(cors({ origin: env.cors.origin }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.env === 'production' ? 'combined' : 'dev'));
app.use(apiLimiter);

// Trust proxy headers (needed for req.ip to reflect real client IP behind
// load balancers — relevant for audit logging and rate limiting).
app.set('trust proxy', 1);

// ---- Health check (no auth, no tenant scope) ----
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'EduNexus API is healthy', timestamp: new Date().toISOString() });
});

// ---- PHASE 1 platform foundation routes ----
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
app.use('/tenants', tenantRoutes); // /tenants/school, /tenants/campuses
app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
app.use('/permissions', permissionRoutes);
app.use('/setup-wizard', setupWizardRoutes);
app.use('/audit-logs', auditRoutes);

// ---- 404 + error handling (must be last) ----
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await db.sequelize.authenticate();
    console.log('[DB] Connection established successfully.');

    app.listen(env.port, () => {
      console.log(`[EduNexus] Server running on port ${env.port} (${env.env})`);
    });
  } catch (err) {
    console.error('[STARTUP ERROR]', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
