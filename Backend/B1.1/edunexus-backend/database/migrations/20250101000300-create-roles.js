'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      school_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'schools', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(80), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      is_system: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('roles', ['school_id', 'name'], {
      unique: true,
      name: 'roles_school_id_name_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  },
};
