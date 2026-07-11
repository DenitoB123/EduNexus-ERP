const db = require('../database/models');
const { NotFoundError } = require('../shared/errors/AppError');

/**
 * Note: school CREATION happens through auth.service.registerSchool()
 * (tenant provisioning is tied to creating the owner account), so this
 * service only exposes read/update for the already-provisioned tenant.
 */
async function getSchoolById(schoolId) {
  const school = await db.School.findByPk(schoolId);
  if (!school) throw new NotFoundError('School not found');
  return school;
}

async function updateSchool(schoolId, updates) {
  const school = await getSchoolById(schoolId);

  const allowedFields = ['name', 'phone', 'address', 'country', 'timezone', 'logo_url', 'settings'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) school[field] = updates[field];
  });

  await school.save();
  return school;
}

module.exports = { getSchoolById, updateSchool };
