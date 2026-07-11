'use strict';
const { v4: uuidv4 } = require('uuid');
const { SYSTEM_PERMISSIONS } = require('../../shared/constants/permissions');

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = SYSTEM_PERMISSIONS.map(([name, description, module, action]) => ({
      id: uuidv4(),
      name,
      description,
      module,
      action,
      created_at: now,
      updated_at: now,
    }));
    await queryInterface.bulkInsert('permissions', rows, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permissions', null, {});
  },
};
