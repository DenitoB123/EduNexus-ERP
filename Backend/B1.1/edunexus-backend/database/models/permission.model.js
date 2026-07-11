const { Model, DataTypes } = require('sequelize');

/**
 * Permissions are a GLOBAL platform catalog (no school_id) — e.g.
 * "user.create", "role.manage". Schools don't own permissions, they
 * only choose which permissions to attach to their roles via
 * role_permissions. This keeps the permission catalog consistent
 * across the whole platform and easy to extend with future ERP modules.
 */
module.exports = (sequelize) => {
  class Permission extends Model {
    static associate(models) {
      Permission.belongsToMany(models.Role, {
        through: models.RolePermission,
        foreignKey: 'permission_id',
        otherKey: 'role_id',
        as: 'roles',
      });
    }
  }

  Permission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
        comment: 'Format: <module>.<action>, e.g. user.create',
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      module: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Permission',
      tableName: 'permissions',
      underscored: true,
      timestamps: true,
    }
  );

  return Permission;
};
