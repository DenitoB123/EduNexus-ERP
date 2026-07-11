'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('schools', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      email: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      country: { type: Sequelize.STRING(80), allowNull: true },
      timezone: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'UTC' },
      logo_url: { type: Sequelize.STRING(500), allowNull: true },
      plan: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'trial' },
      status: {
        type: Sequelize.ENUM('pending_setup', 'active', 'suspended', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending_setup',
      },
      setup_completed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      setup_step: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'school_info' },
      active_modules: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      settings: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('schools');
  },
};
