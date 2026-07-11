'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      school_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'schools', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: { type: Sequelize.STRING(60), allowNull: false },
      entity_type: { type: Sequelize.STRING(60), allowNull: true },
      entity_id: { type: Sequelize.UUID, allowNull: true },
      description: { type: Sequelize.STRING(500), allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('audit_logs', ['school_id', 'created_at']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
