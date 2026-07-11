const { Model, DataTypes } = require('sequelize');

/**
 * Junction table: which roles are assigned to which user.
 * A user may hold multiple roles within their school (e.g. teacher + librarian).
 */
module.exports = (sequelize) => {
  class UserRole extends Model {
    static associate(models) {
      UserRole.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      UserRole.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    }
  }

  UserRole.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      assigned_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'user_id of who assigned this role (for audit trail)',
      },
    },
    {
      sequelize,
      modelName: 'UserRole',
      tableName: 'user_roles',
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['user_id', 'role_id'] },
      ],
    }
  );

  return UserRole;
};
