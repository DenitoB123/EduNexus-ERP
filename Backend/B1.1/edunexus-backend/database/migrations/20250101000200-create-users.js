'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      school_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'schools', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      campus_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'campuses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      first_name: { type: Sequelize.STRING(80), allowNull: false },
      last_name: { type: Sequelize.STRING(80), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'invited', 'suspended'),
        allowNull: false,
        defaultValue: 'invited',
      },
      is_school_owner: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      failed_login_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      locked_until: { type: Sequelize.DATE, allowNull: true },
      password_reset_token_hash: { type: Sequelize.STRING(255), allowNull: true },
      password_reset_expires_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('users', ['school_id', 'email'], {
      unique: true,
      name: 'users_school_id_email_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
