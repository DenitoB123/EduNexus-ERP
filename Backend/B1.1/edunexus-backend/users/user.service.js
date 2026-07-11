const db = require('../database/models');
const { hashPassword } = require('../auth/password.service');
const { NotFoundError, ForbiddenError, ConflictError } = require('../shared/errors/AppError');

async function listUsers({ schoolId, campusId, status }) {
  const where = { school_id: schoolId };
  if (campusId) where.campus_id = campusId;
  if (status) where.status = status;

  return db.User.findAll({
    where,
    include: [{ model: db.Role, as: 'roles', attributes: ['id', 'name'] }],
    order: [['created_at', 'DESC']],
  });
}

async function getUserById(schoolId, userId) {
  const user = await db.User.findOne({
    where: { id: userId, school_id: schoolId },
    include: [{ model: db.Role, as: 'roles', attributes: ['id', 'name'] }],
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

/**
 * Direct user creation by an admin (as opposed to the invitation flow,
 * which is preferred since it lets the user set their own password).
 * Useful for bulk/admin-driven onboarding.
 */
async function createUser({ schoolId, campusId, firstName, lastName, email, password, roleIds = [] }) {
  const existing = await db.User.findOne({ where: { school_id: schoolId, email } });
  if (existing) throw new ConflictError('A user with this email already exists in your school');

  const passwordHash = await hashPassword(password);

  return db.sequelize.transaction(async (tx) => {
    const user = await db.User.create(
      {
        school_id: schoolId,
        campus_id: campusId || null,
        first_name: firstName,
        last_name: lastName,
        email,
        password_hash: passwordHash,
        status: 'active',
      },
      { transaction: tx }
    );

    if (roleIds.length) {
      const rows = roleIds.map((roleId) => ({ user_id: user.id, role_id: roleId }));
      await db.UserRole.bulkCreate(rows, { transaction: tx });
    }

    return user;
  });
}

async function updateUser(schoolId, userId, updates) {
  const user = await getUserById(schoolId, userId);
  const allowedFields = ['first_name', 'last_name', 'phone', 'campus_id'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) user[field] = updates[field];
  });
  await user.save();
  return user;
}

async function deactivateUser(schoolId, userId) {
  const user = await getUserById(schoolId, userId);
  if (user.is_school_owner) throw new ForbiddenError('The school owner account cannot be deactivated');

  user.status = 'inactive';
  await user.save();
  return user;
}

module.exports = { listUsers, getUserById, createUser, updateUser, deactivateUser };
