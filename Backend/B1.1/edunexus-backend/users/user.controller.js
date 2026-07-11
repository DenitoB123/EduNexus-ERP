const asyncHandler = require('../shared/utils/asyncHandler');
const { success, created } = require('../shared/utils/apiResponse');
const userService = require('./user.service');
const { AUDIT_ACTIONS, record: recordAudit } = require('../audit/audit.service');

const listUsers = asyncHandler(async (req, res) => {
  const { campus_id, status } = req.query;
  const users = await userService.listUsers({ schoolId: req.scope.schoolId, campusId: campus_id, status });
  return success(res, { message: 'Users retrieved', data: users.map((u) => u.toSafeJSON()) });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.scope.schoolId, req.params.id);
  return success(res, { message: 'User retrieved', data: user.toSafeJSON() });
});

const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, campusId, roleIds } = req.body;
  const user = await userService.createUser({
    schoolId: req.scope.schoolId,
    campusId,
    firstName,
    lastName,
    email,
    password,
    roleIds,
  });

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'User',
    entityId: user.id,
    description: `Created user ${user.email}`,
    req,
  });

  return created(res, { message: 'User created', data: user.toSafeJSON() });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.scope.schoolId, req.params.id, req.body);

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'User',
    entityId: user.id,
    description: `Updated user ${user.email}`,
    req,
  });

  return success(res, { message: 'User updated', data: user.toSafeJSON() });
});

const deactivateUser = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.scope.schoolId, req.params.id);

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.DELETE,
    entityType: 'User',
    entityId: user.id,
    description: `Deactivated user ${user.email}`,
    req,
  });

  return success(res, { message: 'User deactivated' });
});

const db = require('../database/models');
const { NotFoundError } = require('../shared/errors/AppError');

const getMyProfile = asyncHandler(async (req, res) => {
  // Looked up by id alone (not tenant-scoped) so this also works for
  // platform super_admins, whose school_id is null.
  const user = await db.User.findByPk(req.user.id, {
    include: [{ model: db.Role, as: 'roles', attributes: ['id', 'name'] }],
  });
  if (!user) throw new NotFoundError('User not found');
  return success(res, { message: 'Profile retrieved', data: user.toSafeJSON() });
});

module.exports = { listUsers, getUser, createUser, updateUser, deactivateUser, getMyProfile };
