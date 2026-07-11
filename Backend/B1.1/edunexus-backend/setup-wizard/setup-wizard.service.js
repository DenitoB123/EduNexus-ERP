const db = require('../database/models');
const { SYSTEM_ROLES, DEFAULT_ROLES } = require('../shared/constants/roles');
const { ROLE_PERMISSION_MAP } = require('../shared/constants/role-permission-map');
const { BadRequestError, NotFoundError } = require('../shared/errors/AppError');
const { AUDIT_ACTIONS, record: recordAudit } = require('../audit/audit.service');

/**
 * Ordered Setup Wizard steps. Stored on School.setup_step so the
 * frontend can resume the wizard exactly where the admin left off.
 */
const WIZARD_STEPS = Object.freeze(['school_info', 'structure', 'modules', 'roles', 'launch', 'completed']);

function nextStep(current) {
  const idx = WIZARD_STEPS.indexOf(current);
  if (idx === -1 || idx === WIZARD_STEPS.length - 1) return current;
  return WIZARD_STEPS[idx + 1];
}

/**
 * STEP 0 — BOOTSTRAP (runs automatically inside registerSchool's
 * transaction, not exposed as its own HTTP step). Creates the
 * school_admin system role with every permission, plus all other
 * default system roles with their default permission grants, then
 * assigns school_admin to the school owner so they can log in and
 * drive the rest of the wizard themselves.
 */
async function runSetupWizardBootstrap({ school, owner, transaction }) {
  const allPermissions = await db.Permission.findAll({ transaction });

  // school_admin gets every permission in the catalog.
  const schoolAdminRole = await db.Role.create(
    {
      school_id: school.id,
      name: DEFAULT_ROLES.SCHOOL_ADMIN,
      description: 'Full administrative access within the school',
      is_system: true,
    },
    { transaction }
  );
  await db.RolePermission.bulkCreate(
    allPermissions.map((p) => ({ role_id: schoolAdminRole.id, permission_id: p.id })),
    { transaction }
  );

  // Remaining default roles, each with their mapped default permissions.
  // school_admin is excluded here since it was already created above.
  const permissionByName = new Map(allPermissions.map((p) => [p.name, p]));
  for (const roleDef of SYSTEM_ROLES) {
    if (roleDef.name === DEFAULT_ROLES.SCHOOL_ADMIN) continue;

    const role = await db.Role.create(
      { school_id: school.id, name: roleDef.name, description: roleDef.description, is_system: true },
      { transaction }
    );

    const grantedNames = ROLE_PERMISSION_MAP[roleDef.name] || [];
    const rows = grantedNames
      .map((name) => permissionByName.get(name))
      .filter(Boolean)
      .map((perm) => ({ role_id: role.id, permission_id: perm.id }));

    if (rows.length) await db.RolePermission.bulkCreate(rows, { transaction });
  }

  await db.UserRole.create(
    { user_id: owner.id, role_id: schoolAdminRole.id, assigned_by: owner.id },
    { transaction }
  );

  school.setup_step = 'school_info';
  await school.save({ transaction });
}

/**
 * STEP 1 — SCHOOL INFO. Finalizes basic identity/contact details.
 * (The school row already exists from registration; this step lets
 * the admin fill in anything not captured at registration time.)
 */
async function completeSchoolInfoStep(schoolId, { address, phone, country, timezone, logoUrl }) {
  const school = await getSchoolOrThrow(schoolId);
  if (address !== undefined) school.address = address;
  if (phone !== undefined) school.phone = phone;
  if (country !== undefined) school.country = country;
  if (timezone !== undefined) school.timezone = timezone;
  if (logoUrl !== undefined) school.logo_url = logoUrl;

  school.setup_step = nextStep('school_info');
  await school.save();
  return school;
}

/**
 * STEP 2 — STRUCTURE. Creates departments, classes, and streams.
 * Phase 1 stores these inside School.settings.structure as JSON
 * scaffolding (no dedicated tables yet — those belong to the future
 * Academics ERP module). This still satisfies "Setup Wizard creates
 * departments/classes/streams" without prematurely building out the
 * full academics schema ahead of schedule.
 */
async function completeStructureStep(schoolId, { departments = [], classes = [], streams = [] }) {
  const school = await getSchoolOrThrow(schoolId);

  if (!Array.isArray(departments) || !Array.isArray(classes) || !Array.isArray(streams)) {
    throw new BadRequestError('departments, classes, and streams must be arrays');
  }

  school.settings = {
    ...school.settings,
    structure: { departments, classes, streams },
  };

  school.setup_step = nextStep('structure');
  await school.save();
  return school;
}

/**
 * STEP 3 — MODULES. Activates the ERP modules the school wants to use.
 * Only the module KEY is stored — actual module schemas/routes are
 * built in later phases. This lets the platform "remember" intent now.
 */
const AVAILABLE_MODULES = Object.freeze([
  'students', 'academics', 'attendance', 'finance', 'library',
  'transport', 'hostel', 'examinations', 'communication', 'hr',
]);

async function completeModulesStep(schoolId, { modules = [] }) {
  const school = await getSchoolOrThrow(schoolId);

  const invalid = modules.filter((m) => !AVAILABLE_MODULES.includes(m));
  if (invalid.length) {
    throw new BadRequestError(`Unknown module(s): ${invalid.join(', ')}`);
  }

  school.active_modules = Array.from(new Set(modules));
  school.setup_step = nextStep('modules');
  await school.save();
  return school;
}

/**
 * STEP 4 — ROLES. Default system roles already exist from bootstrap;
 * this step lets the admin add school-specific custom roles before
 * launch, and/or confirm the defaults are acceptable.
 */
async function completeRolesStep(schoolId, { customRoles = [] }) {
  const school = await getSchoolOrThrow(schoolId);

  for (const roleDef of customRoles) {
    if (!roleDef.name) continue;
    const exists = await db.Role.findOne({ where: { school_id: schoolId, name: roleDef.name } });
    if (!exists) {
      await db.Role.create({
        school_id: schoolId,
        name: roleDef.name,
        description: roleDef.description || null,
        is_system: false,
      });
    }
  }

  school.setup_step = nextStep('roles');
  await school.save();
  return school;
}

/**
 * STEP 5 — LAUNCH. Marks the tenant active and the wizard complete.
 */
async function completeLaunchStep(schoolId, req) {
  const school = await getSchoolOrThrow(schoolId);

  school.status = 'active';
  school.setup_completed = true;
  school.setup_step = 'completed';
  await school.save();

  await recordAudit({
    schoolId: school.id,
    userId: req && req.user ? req.user.id : null,
    action: AUDIT_ACTIONS.SETUP_WIZARD_STEP,
    entityType: 'School',
    entityId: school.id,
    description: 'Setup Wizard completed — school is now active',
    req,
  });

  return school;
}

async function getWizardStatus(schoolId) {
  const school = await getSchoolOrThrow(schoolId);
  return {
    currentStep: school.setup_step,
    steps: WIZARD_STEPS.filter((s) => s !== 'completed'),
    completed: school.setup_completed,
    activeModules: school.active_modules,
  };
}

async function getSchoolOrThrow(schoolId) {
  const school = await db.School.findByPk(schoolId);
  if (!school) throw new NotFoundError('School not found');
  return school;
}

module.exports = {
  WIZARD_STEPS,
  AVAILABLE_MODULES,
  runSetupWizardBootstrap,
  completeSchoolInfoStep,
  completeStructureStep,
  completeModulesStep,
  completeRolesStep,
  completeLaunchStep,
  getWizardStatus,
};
