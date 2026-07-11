const { Model, DataTypes } = require('sequelize');

/**
 * Junction table: which permissions are granted to which role.
 */
module.exports = (sequelize) => {
  class RolePermission extends Model {
    static associate(models) {
      RolePermission.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
      RolePermission.belongsTo(models.Permission, { foreignKey: 'permission_id', as: 'permission' });
    }
  }

  RolePermission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      granted_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'user_id of who granted this permission to the role (for audit trail)',
      },
    },
    {
      sequelize,
      modelName: 'RolePermission',
      tableName: 'role_permissions',
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['role_id', 'permission_id'] },
      ],
    }
  );

  return RolePermission;
};
