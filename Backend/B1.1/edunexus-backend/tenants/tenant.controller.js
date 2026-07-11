const asyncHandler = require('../shared/utils/asyncHandler');
const { success, created } = require('../shared/utils/apiResponse');
const schoolService = require('./school.service');
const campusService = require('./campus.service');
const { AUDIT_ACTIONS, record: recordAudit } = require('../audit/audit.service');

// ---- School (tenant) ----

const getMySchool = asyncHandler(async (req, res) => {
  const school = await schoolService.getSchoolById(req.scope.schoolId);
  return success(res, { message: 'School retrieved', data: school });
});

const updateMySchool = asyncHandler(async (req, res) => {
  const school = await schoolService.updateSchool(req.scope.schoolId, req.body);

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'School',
    entityId: school.id,
    description: 'Updated school settings',
    req,
  });

  return success(res, { message: 'School updated', data: school });
});

// ---- Campuses ----

const listCampuses = asyncHandler(async (req, res) => {
  const campuses = await campusService.listCampuses(req.scope.schoolId);
  return success(res, { message: 'Campuses retrieved', data: campuses });
});

const getCampus = asyncHandler(async (req, res) => {
  const campus = await campusService.getCampusById(req.scope.schoolId, req.params.id);
  return success(res, { message: 'Campus retrieved', data: campus });
});

const createCampus = asyncHandler(async (req, res) => {
  const campus = await campusService.createCampus(req.scope.schoolId, req.body);

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'Campus',
    entityId: campus.id,
    description: `Created campus "${campus.name}"`,
    req,
  });

  return created(res, { message: 'Campus created', data: campus });
});

const updateCampus = asyncHandler(async (req, res) => {
  const campus = await campusService.updateCampus(req.scope.schoolId, req.params.id, req.body);

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'Campus',
    entityId: campus.id,
    description: `Updated campus "${campus.name}"`,
    req,
  });

  return success(res, { message: 'Campus updated', data: campus });
});

const deleteCampus = asyncHandler(async (req, res) => {
  const campus = await campusService.deleteCampus(req.scope.schoolId, req.params.id);

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.DELETE,
    entityType: 'Campus',
    entityId: campus.id,
    description: `Deleted campus "${campus.name}"`,
    req,
  });

  return success(res, { message: 'Campus deleted' });
});

module.exports = {
  getMySchool,
  updateMySchool,
  listCampuses,
  getCampus,
  createCampus,
  updateCampus,
  deleteCampus,
};
