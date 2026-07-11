const { Model, DataTypes } = require('sequelize');

/**
 * Immutable audit trail. Every sensitive action (login, logout, create,
 * update, delete, role change, permission change) writes one row here.
 * Audit logs are append-only: no update/delete routes are ever exposed.
 */
module.exports = (sequelize) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
      AuditLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  AuditLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      school_id: {
        type: DataTypes.UUID,
        allowNull: true, // null for platform-level actions (e.g. super_admin actions, school registration)
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true, // null for unauthenticated events like failed login attempts
      },
      action: {
        type: DataTypes.STRING(60),
        allowNull: false,
        comment: 'e.g. login, logout, create, update, delete, role_change, permission_change',
      },
      entity_type: {
        type: DataTypes.STRING(60),
        allowNull: true,
        comment: 'e.g. User, Role, School, Campus, Permission',
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Arbitrary structured context: before/after diffs, etc.',
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      underscored: true,
      timestamps: true,
      updatedAt: false, // append-only — no updated_at needed
      indexes: [
        { fields: ['school_id', 'created_at'] },
        { fields: ['user_id'] },
        { fields: ['action'] },
      ],
    }
  );

  return AuditLog;
};
