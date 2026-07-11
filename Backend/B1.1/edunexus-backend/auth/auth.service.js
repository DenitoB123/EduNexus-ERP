const { Op } = require('sequelize');
const db = require('../database/models');
const { hashPassword, comparePassword } = require('./password.service');
const { signAccessToken } = require('./jwt.service');
const { createSession, validateRefreshToken, revokeSession, revokeAllUserSessions } = require('./session.service');
const { getUserRolesAndPermissions } = require('../roles/role.service');
const { runSetupWizardBootstrap } = require('../setup-wizard/setup-wizard.service');
const { generateSecureToken, hashToken, slugify } = require('../shared/utils/tokens');
const { AUDIT_ACTIONS, record: recordAudit } = require('../audit/audit.service');
const {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} = require('../shared/errors/AppError');
const env = require('../config/env');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * Registers a brand-new school (tenant) plus its first user, who
 * becomes the school owner / school_admin. This is the entry point
 * to tenant provisioning — the Setup Wizard then takes over for
 * departments/classes/streams/roles/modules.
 */
async function registerSchool({ schoolName, email, password, firstName, lastName, country, timezone }) {
  const existingSchool = await db.School.findOne({ where: { email } });
  if (existingSchool) throw new ConflictError('A school is already registered with this email');

  const baseSlug = slugify(schoolName);
  let slug = baseSlug;
  let suffix = 1;
  // Guarantee slug uniqueness without surfacing collisions to the user.
  while (await db.School.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const result = await db.sequelize.transaction(async (tx) => {
    const school = await db.School.create(
      {
        name: schoolName,
        slug,
        email,
        country,
        timezone: timezone || 'UTC',
        status: 'pending_setup',
        setup_step: 'school_info',
      },
      { transaction: tx }
    );

    const passwordHash = await hashPassword(password);
    const owner = await db.User.create(
      {
        school_id: school.id,
        first_name: firstName,
        last_name: lastName,
        email,
        password_hash: passwordHash,
        status: 'active',
        is_school_owner: true,
      },
      { transaction: tx }
    );

    // Bootstraps default roles/permissions + assigns school_admin to the owner,
    // so the owner can log in immediately and drive the rest of the wizard.
    await runSetupWizardBootstrap({ school, owner, transaction: tx });

    return { school, owner };
  });

  await recordAudit({
    schoolId: result.school.id,
    userId: result.owner.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'School',
    entityId: result.school.id,
    description: `School "${result.school.name}" registered`,
  });

  return result;
}

async function buildAuthResponse(user, req) {
  const { roles, permissions } = await getUserRolesAndPermissions(user.id);

  const accessToken = signAccessToken({
    userId: user.id,
    schoolId: user.school_id,
    roles,
    permissions,
  });

  const { refreshToken } = await createSession({
    userId: user.id,
    schoolId: user.school_id,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  return {
    accessToken,
    refreshToken,
    user: user.toSafeJSON(),
    roles,
    permissions,
  };
}

async function login({ email, password }, req) {
  const user = await db.User.findOne({ where: { email } });

  if (!user) {
    await recordAudit({ action: AUDIT_ACTIONS.LOGIN_FAILED, description: `Login failed for unknown email: ${email}`, req });
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.locked_until && user.locked_until > new Date()) {
    throw new UnauthorizedError('Account temporarily locked due to repeated failed login attempts');
  }

  if (user.status !== 'active') {
    throw new UnauthorizedError('Account is not active. Please contact your administrator.');
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    user.failed_login_attempts += 1;
    if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
      user.locked_until = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();

    await recordAudit({
      schoolId: user.school_id,
      userId: user.id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      description: 'Incorrect password',
      req,
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  user.failed_login_attempts = 0;
  user.locked_until = null;
  user.last_login_at = new Date();
  await user.save();

  const authResponse = await buildAuthResponse(user, req);

  await recordAudit({
    schoolId: user.school_id,
    userId: user.id,
    action: AUDIT_ACTIONS.LOGIN,
    description: 'User logged in',
    req,
  });

  return authResponse;
}

async function logout({ refreshToken }, req) {
  if (!refreshToken) return;
  try {
    const session = await validateRefreshToken(refreshToken);
    await revokeSession(session.id);
    await recordAudit({
      schoolId: session.school_id,
      userId: session.user_id,
      action: AUDIT_ACTIONS.LOGOUT,
      description: 'User logged out',
      req,
    });
  } catch (err) {
    // Logging out with an already-invalid token is not an error worth surfacing.
  }
}

async function refreshAccessToken({ refreshToken }) {
  const session = await validateRefreshToken(refreshToken);
  const user = await db.User.findByPk(session.user_id);
  if (!user || user.status !== 'active') {
    throw new UnauthorizedError('Account is not active');
  }

  const { roles, permissions } = await getUserRolesAndPermissions(user.id);
  const accessToken = signAccessToken({ userId: user.id, schoolId: user.school_id, roles, permissions });

  return { accessToken, user: user.toSafeJSON(), roles, permissions };
}

async function forgotPassword({ email }) {
  const user = await db.User.findOne({ where: { email } });
  // Always behave the same whether or not the email exists, to avoid
  // leaking which emails are registered.
  if (!user) return;

  const rawToken = generateSecureToken();
  user.password_reset_token_hash = hashToken(rawToken);
  user.password_reset_expires_at = new Date(Date.now() + env.passwordReset.expiresMinutes * 60 * 1000);
  await user.save();

  await recordAudit({
    schoolId: user.school_id,
    userId: user.id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    description: 'Password reset requested',
  });

  // In production this token is emailed to the user, never returned via API.
  return { rawToken, user };
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);
  const user = await db.User.findOne({
    where: {
      password_reset_token_hash: tokenHash,
      password_reset_expires_at: { [Op.gt]: new Date() },
    },
  });

  if (!user) throw new BadRequestError('Invalid or expired password reset token');

  user.password_hash = await hashPassword(newPassword);
  user.password_reset_token_hash = null;
  user.password_reset_expires_at = null;
  user.failed_login_attempts = 0;
  user.locked_until = null;
  await user.save();

  await revokeAllUserSessions(user.id);

  await recordAudit({
    schoolId: user.school_id,
    userId: user.id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    description: 'Password reset completed; all sessions revoked',
  });

  return user;
}

/**
 * Invites a new user to a school by email + role. Does not create the
 * User row yet — that happens on acceptInvitation() once the invitee
 * sets their password, so unaccepted invitations never create dangling
 * unusable accounts.
 */
async function inviteUser({ schoolId, email, roleId, campusId, invitedBy }) {
  const existingUser = await db.User.findOne({ where: { school_id: schoolId, email } });
  if (existingUser) throw new ConflictError('A user with this email already exists in your school');

  const role = await db.Role.findOne({ where: { id: roleId, school_id: schoolId } });
  if (!role) throw new NotFoundError('Role not found for this school');

  const rawToken = generateSecureToken();
  const invitation = await db.Invitation.create({
    school_id: schoolId,
    email,
    role_id: roleId,
    campus_id: campusId || null,
    invited_by: invitedBy,
    token_hash: hashToken(rawToken),
    status: 'pending',
    expires_at: new Date(Date.now() + env.invitation.expiresHours * 60 * 60 * 1000),
  });

  await recordAudit({
    schoolId,
    userId: invitedBy,
    action: AUDIT_ACTIONS.INVITATION_SENT,
    entityType: 'Invitation',
    entityId: invitation.id,
    description: `Invited ${email} as ${role.name}`,
  });

  // TODO(Phase 2+): replace with a real transactional email service.
  // For now, the raw token is logged in non-production so the invite
  // flow is testable end-to-end without an email provider configured.
  if (env.env !== 'production') {
    console.log(`[INVITATION] Token for ${email}: ${rawToken}`);
  }

  // rawToken is returned so the calling controller/notification layer can
  // email it; it is never persisted in plaintext.
  return { invitation, rawToken };
}

async function acceptInvitation({ token, firstName, lastName, password }, req) {
  const tokenHash = hashToken(token);
  const invitation = await db.Invitation.findOne({
    where: { token_hash: tokenHash, status: 'pending', expires_at: { [Op.gt]: new Date() } },
  });

  if (!invitation) throw new BadRequestError('Invalid or expired invitation');

  const result = await db.sequelize.transaction(async (tx) => {
    const passwordHash = await hashPassword(password);
    const user = await db.User.create(
      {
        school_id: invitation.school_id,
        campus_id: invitation.campus_id,
        first_name: firstName,
        last_name: lastName,
        email: invitation.email,
        password_hash: passwordHash,
        status: 'active',
      },
      { transaction: tx }
    );

    await db.UserRole.create(
      { user_id: user.id, role_id: invitation.role_id, assigned_by: invitation.invited_by },
      { transaction: tx }
    );

    invitation.status = 'accepted';
    invitation.accepted_at = new Date();
    await invitation.save({ transaction: tx });

    return user;
  });

  await recordAudit({
    schoolId: invitation.school_id,
    userId: result.id,
    action: AUDIT_ACTIONS.INVITATION_ACCEPTED,
    entityType: 'User',
    entityId: result.id,
    description: 'Invitation accepted, account activated',
    req,
  });

  return buildAuthResponse(result, req);
}

module.exports = {
  registerSchool,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  inviteUser,
  acceptInvitation,
  buildAuthResponse,
};
