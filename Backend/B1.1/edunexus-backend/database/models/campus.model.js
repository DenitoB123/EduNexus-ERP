const { Model, DataTypes } = require('sequelize');

/**
 * Campuses belong to a School. A school can have multiple physical
 * campuses/branches, each scoped to the same school_id (tenant).
 */
module.exports = (sequelize) => {
  class Campus extends Model {
    static associate(models) {
      Campus.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
      Campus.hasMany(models.User, { foreignKey: 'campus_id', as: 'users' });
    }
  }

  Campus.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      school_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'Short campus code, unique within the school, e.g. MAIN, NORTH',
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      is_main: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      modelName: 'Campus',
      tableName: 'campuses',
      paranoid: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ['school_id', 'code'] },
      ],
    }
  );

  return Campus;
};
