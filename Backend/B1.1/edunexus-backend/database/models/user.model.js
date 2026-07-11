const { Model, DataTypes } = require('sequelize');

/**
 * Users are scoped to a school (tenant) via school_id, except for
 * platform-level super_admin accounts where school_id is null.
 * Password hashing is handled in the auth service, not in hooks here,
 * to keep the model layer free of business logic per SOLID separation.
 */
module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
      User.belongsTo(models.Campus, { foreignKey: 'campus_id', as: 'campus' });
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles',
      });
      User.hasMany(models.Session, { foreignKey: 'user_id', as: 'sessions' });
      User.hasMany(models.Invitation, { foreignKey: 'invited_by', as: 'sentInvitations' });
      User.hasMany(models.AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
    }

    toSafeJSON() {
      const json = this.toJSON();
      delete json.password_hash;
      delete json.password_reset_token_hash;
      delete json.password_reset_expires_at;
      return json;
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      school_id: {
        type: DataTypes.UUID,
        allowNull: true, // null only for platform super_admins
      },
      campus_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      first_name: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(80),
        allowNull: false,
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
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'invited', 'suspended'),
        allowNull: false,
        defaultValue: 'invited',
      },
      is_school_owner: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True for the user who registered the school (cannot be demoted/deleted by others)',
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      failed_login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      password_reset_token_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      password_reset_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      paranoid: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ['school_id', 'email'] },
      ],
    }
  );

  return User;
};
