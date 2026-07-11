const db = require('../database/models');
const { NotFoundError, ConflictError } = require('../shared/errors/AppError');

async function listCampuses(schoolId) {
  return db.Campus.findAll({ where: { school_id: schoolId }, order: [['is_main', 'DESC'], ['name', 'ASC']] });
}

async function getCampusById(schoolId, campusId) {
  const campus = await db.Campus.findOne({ where: { id: campusId, school_id: schoolId } });
  if (!campus) throw new NotFoundError('Campus not found');
  return campus;
}

async function createCampus(schoolId, { name, code, address, phone, isMain }) {
  const existing = await db.Campus.findOne({ where: { school_id: schoolId, code } });
  if (existing) throw new ConflictError(`Campus code "${code}" already exists for this school`);

  return db.Campus.create({
    school_id: schoolId,
    name,
    code,
    address,
    phone,
    is_main: Boolean(isMain),
  });
}

async function updateCampus(schoolId, campusId, updates) {
  const campus = await getCampusById(schoolId, campusId);
  const allowedFields = ['name', 'code', 'address', 'phone', 'is_main', 'status'];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) campus[field] = updates[field];
  });
  await campus.save();
  return campus;
}

async function deleteCampus(schoolId, campusId) {
  const campus = await getCampusById(schoolId, campusId);
  await campus.destroy();
  return campus;
}

module.exports = { listCampuses, getCampusById, createCampus, updateCampus, deleteCampus };
