'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invitations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      school_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'schools', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      email: { type: Sequelize.STRING(150), allowNull: false },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
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
      invited_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'expired', 'revoked'),
        allowNull: false,
        defaultValue: 'pending',
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('invitations', ['school_id', 'email']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invitations');
  },
};
