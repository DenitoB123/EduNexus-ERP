/**
 * System-level default roles created for every new school tenant
 * during the Setup Wizard "Roles" step.
 * These are seed names — schools can add custom roles afterward.
 */
const DEFAULT_ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin', // platform-level (EduNexus staff only, school_id = null)
  SCHOOL_ADMIN: 'school_admin', // full control within a school
  PRINCIPAL: 'principal',
  TEACHER: 'teacher',
  ACCOUNTANT: 'accountant',
  LIBRARIAN: 'librarian',
  RECEPTIONIST: 'receptionist',
  STUDENT: 'student',
  PARENT: 'parent',
});

const SYSTEM_ROLES = [
  { name: DEFAULT_ROLES.SCHOOL_ADMIN, description: 'Full administrative access within the school', is_system: true },
  { name: DEFAULT_ROLES.PRINCIPAL, description: 'School leadership and oversight', is_system: true },
  { name: DEFAULT_ROLES.TEACHER, description: 'Manages classes, attendance and academics', is_system: true },
  { name: DEFAULT_ROLES.ACCOUNTANT, description: 'Manages fees and financial records', is_system: true },
  { name: DEFAULT_ROLES.LIBRARIAN, description: 'Manages library resources', is_system: true },
  { name: DEFAULT_ROLES.RECEPTIONIST, description: 'Front-desk and enquiry management', is_system: true },
  { name: DEFAULT_ROLES.STUDENT, description: 'Student portal access', is_system: true },
  { name: DEFAULT_ROLES.PARENT, description: 'Parent/guardian portal access', is_system: true },
];

module.exports = { DEFAULT_ROLES, SYSTEM_ROLES };
