const db = require('../database/models');
const { NotFoundError, ConflictError, ForbiddenError } = require('../shared/errors/AppError');

/**
 * Loads a user's roles and the flattened, deduplicated list of
 * permission names across all of those roles. This is the data that
 * gets embedded into the JWT access token payload (see auth.service.js)
 * and is recomputed on every login/refresh so role/permission changes
 * take effect the next time a token is issued.
 */
async function getUserRolesAndPermissions(userId) {
  const user = await db.User.findByPk(userId, {
    include: [
      {
        model: db.Role,
        as: 'roles',
        include: [{ model: db.Permission, as: 'permissions', attributes: ['name'] }],
      },
    ],
  });

  if (!user) throw new NotFoundError('User not found');

  const roles = user.roles.map((r) => r.name);
  const permissionSet = new Set();
  user.roles.forEach((role) => {
    role.permissions.forEach((perm) => permissionSet.add(perm.name));
  });

  return { roles, permissions: Array.from(permissionSet) };
}

async function listRoles({ schoolId, includeSystem = true }) {
  const where = { school_id: schoolId };
  if (!includeSystem) where.is_system = false;
  return db.Role.findAll({
    where,
    include: [{ model: db.Permission, as: 'permissions', attributes: ['id', 'name', 'module', 'action'] }],
    order: [['name', 'ASC']],
  });
}

async function createRole({ schoolId, name, description }) {
  const existing = await db.Role.findOne({ where: { school_id: schoolId, name } });
  if (existing) throw new ConflictError(`Role "${name}" already exists for this school`);

  return db.Role.create({ school_id: schoolId, name, description, is_system: false });
}

async function updateRole({ schoolId, roleId, name, description }) {
  const role = await db.Role.findOne({ where: { id: roleId, school_id: schoolId } });
  if (!role) throw new NotFoundError('Role not found');
  if (role.is_system) throw new ForbiddenError('System roles cannot be renamed');

  if (name) role.name = name;
  if (description !== undefined) role.description = description;
  await role.save();
  return role;
}

async function deleteRole({ schoolId, roleId }) {
  const role = await db.Role.findOne({ where: { id: roleId, school_id: schoolId } });
  if (!role) throw new NotFoundError('Role not found');
  if (role.is_system) throw new ForbiddenError('System roles cannot be deleted');

  await role.destroy();
  return role;
}

/**
 * Replaces a role's permission set entirely with the given list of
 * permission names. Used by PUT /roles/:id/permissions.
 */
async function setRolePermissions({ schoolId, roleId, permissionNames, grantedBy }) {
  const role = await db.Role.findOne({ where: { id: roleId, school_id: schoolId } });
  if (!role) throw new NotFoundError('Role not found');

  const permissions = await db.Permission.findAll({ where: { name: permissionNames } });

  await db.RolePermission.destroy({ where: { role_id: role.id } });
  const rows = permissions.map((p) => ({ role_id: role.id, permission_id: p.id, granted_by: grantedBy }));
  if (rows.length) await db.RolePermission.bulkCreate(rows);

  return role.reload({ include: [{ model: db.Permission, as: 'permissions' }] });
}

async function assignRoleToUser({ userId, roleId, assignedBy }) {
  const existing = await db.UserRole.findOne({ where: { user_id: userId, role_id: roleId } });
  if (existing) throw new ConflictError('User already has this role');
  return db.UserRole.create({ user_id: userId, role_id: roleId, assigned_by: assignedBy });
}

async function removeRoleFromUser({ userId, roleId }) {
  const userRole = await db.UserRole.findOne({ where: { user_id: userId, role_id: roleId } });
  if (!userRole) throw new NotFoundError('User does not have this role');
  await userRole.destroy();
}

module.exports = {
  getUserRolesAndPermissions,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  assignRoleToUser,
  removeRoleFromUser,
};
