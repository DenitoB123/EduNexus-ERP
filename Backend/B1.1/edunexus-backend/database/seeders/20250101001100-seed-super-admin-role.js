'use strict';
const { v4: uuidv4 } = require('uuid');
const { DEFAULT_ROLES } = require('../../shared/constants/roles');

/**
 * Creates the platform-wide super_admin role (school_id = null) and
 * grants it every permission in the catalog. This role is for
 * Anthropic-of-EduNexus staff who manage the whole SaaS platform,
 * not for individual schools.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [permissions] = await queryInterface.sequelize.query('SELECT id FROM permissions;');
    if (permissions.length === 0) {
      throw new Error('Run the permissions seeder before the super-admin-role seeder.');
    }

    const roleId = uuidv4();
    await queryInterface.bulkInsert('roles', [
      {
        id: roleId,
        school_id: null,
        name: DEFAULT_ROLES.SUPER_ADMIN,
        description: 'Platform super administrator with full access across all schools',
        is_system: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    const rolePermissionRows = permissions.map((p) => ({
      id: uuidv4(),
      role_id: roleId,
      permission_id: p.id,
      granted_by: null,
      created_at: now,
      updated_at: now,
    }));
    await queryInterface.bulkInsert('role_permissions', rolePermissionRows);
  },

  async down(queryInterface) {
    const [[role]] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = '${DEFAULT_ROLES.SUPER_ADMIN}' AND school_id IS NULL LIMIT 1;`
    );
    if (role) {
      await queryInterface.bulkDelete('role_permissions', { role_id: role.id }, {});
      await queryInterface.bulkDelete('roles', { id: role.id }, {});
    }
  },
};
