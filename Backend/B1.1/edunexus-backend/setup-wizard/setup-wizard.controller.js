const asyncHandler = require('../shared/utils/asyncHandler');
const { success } = require('../shared/utils/apiResponse');
const wizardService = require('./setup-wizard.service');
const { AUDIT_ACTIONS, record: recordAudit } = require('../audit/audit.service');

const getStatus = asyncHandler(async (req, res) => {
  const status = await wizardService.getWizardStatus(req.scope.schoolId);
  return success(res, { message: 'Setup wizard status retrieved', data: status });
});

async function auditStep(req, stepName) {
  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.SETUP_WIZARD_STEP,
    entityType: 'School',
    entityId: req.scope.schoolId,
    description: `Completed setup wizard step: ${stepName}`,
    req,
  });
}

const schoolInfoStep = asyncHandler(async (req, res) => {
  const school = await wizardService.completeSchoolInfoStep(req.scope.schoolId, req.body);
  await auditStep(req, 'school_info');
  return success(res, { message: 'School info step completed', data: school });
});

const structureStep = asyncHandler(async (req, res) => {
  const school = await wizardService.completeStructureStep(req.scope.schoolId, req.body);
  await auditStep(req, 'structure');
  return success(res, { message: 'Structure step completed', data: school });
});

const modulesStep = asyncHandler(async (req, res) => {
  const school = await wizardService.completeModulesStep(req.scope.schoolId, req.body);
  await auditStep(req, 'modules');
  return success(res, { message: 'Modules step completed', data: school });
});

const rolesStep = asyncHandler(async (req, res) => {
  const school = await wizardService.completeRolesStep(req.scope.schoolId, req.body);
  await auditStep(req, 'roles');
  return success(res, { message: 'Roles step completed', data: school });
});

const launchStep = asyncHandler(async (req, res) => {
  const school = await wizardService.completeLaunchStep(req.scope.schoolId, req);
  return success(res, { message: 'School launched successfully! Setup wizard complete.', data: school });
});

module.exports = { getStatus, schoolInfoStep, structureStep, modulesStep, rolesStep, launchStep };
