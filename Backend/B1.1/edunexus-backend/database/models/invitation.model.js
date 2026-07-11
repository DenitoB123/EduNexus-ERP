const { Model, DataTypes } = require('sequelize');

/**
 * Invitations allow a school admin to invite a new user by email.
 * The invited user receives a one-time token (hashed at rest) to
 * set their password and activate their account via POST /auth/accept-invitation.
 */
module.exports = (sequelize) => {
  class Invitation extends Model {
    static associate(models) {
      Invitation.belongsTo(models.School, { foreignKey: 'school_id', as: 'school' });
      Invitation.belongsTo(models.User, { foreignKey: 'invited_by', as: 'inviter' });
      Invitation.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    }
  }

  Invitation.init(
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
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { isEmail: true },
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      campus_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      invited_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'expired', 'revoked'),
        allowNull: false,
        defaultValue: 'pending',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      accepted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Invitation',
      tableName: 'invitations',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['school_id', 'email'] },
      ],
    }
  );

  return Invitation;
};
