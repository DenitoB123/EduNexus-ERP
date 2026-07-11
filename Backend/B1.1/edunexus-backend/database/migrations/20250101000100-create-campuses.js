'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('campuses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      school_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'schools', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(30), allowNull: false },
      address: { type: Sequelize.TEXT, allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      is_main: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('campuses', ['school_id', 'code'], {
      unique: true,
      name: 'campuses_school_id_code_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('campuses');
  },
};
