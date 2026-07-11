const { Model, DataTypes } = require('sequelize');

/**
 * Schools = Tenants. Every business record in the platform belongs to
 * exactly one school via school_id. There is no row-level cross-tenant
 * relationship anywhere in Phase 1.
 */
module.exports = (sequelize) => {
  class School extends Model {
    static associate(models) {
      School.hasMany(models.Campus, { foreignKey: 'school_id', as: 'campuses' });
      School.hasMany(models.User, { foreignKey: 'school_id', as: 'users' });
      School.hasMany(models.Role, { foreignKey: 'school_id', as: 'roles' });
      School.hasMany(models.Invitation, { foreignKey: 'school_id', as: 'invitations' });
      School.hasMany(models.AuditLog, { foreignKey: 'school_id', as: 'auditLogs' });
    }
  }

  School.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
        comment: 'Used for subdomain / tenant lookup, e.g. greenwood-high',
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { isEmail: true },
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      timezone: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: 'UTC',
      },
      logo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      plan: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'trial',
        comment: 'Subscription/billing plan tier, e.g. trial, basic, premium',
      },
      status: {
        type: DataTypes.ENUM('pending_setup', 'active', 'suspended', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending_setup',
      },
      setup_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      setup_step: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'school_info',
        comment: 'Current Setup Wizard step: school_info, structure, modules, roles, launch, completed',
      },
      active_modules: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'List of ERP modules activated for this tenant, e.g. ["students","library"]',
      },
      settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: 'School',
      tableName: 'schools',
      paranoid: true,
      underscored: true,
    }
  );

  return School;
};
