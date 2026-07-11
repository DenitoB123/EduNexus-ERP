const { Model, DataTypes } = require('sequelize');

/**
 * Roles are scoped per school (school_id), except platform-level roles
 * like super_admin which have school_id = null. System roles (is_system)
 * are created automatically by the Setup Wizard and cannot be deleted,
 * but schools may still create their own custom roles.
 */
module.exports = (sequelize) => {
  class Role extends Model {
    static associate(models) {
      Role.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
      Role.belongsToMany(models.Permission, {
        through: models.RolePermission,
        foreignKey: 'role_id',
        otherKey: 'permission_id',
        as: 'permissions',
      });
      Role.belongsToMany(models.User, {
        through: models.UserRole,
        foreignKey: 'role_id',
        otherKey: 'user_id',
        as: 'users',
      });
    }
  }

  Role.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      school_id: {
        type: DataTypes.UUID,
        allowNull: true, // null for platform-wide roles (super_admin)
      },
      name: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'System roles are seeded by the Setup Wizard and cannot be deleted',
      },
    },
    {
      sequelize,
      modelName: 'Role',
      tableName: 'roles',
      paranoid: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ['school_id', 'name'] },
      ],
    }
  );

  return Role;
};
