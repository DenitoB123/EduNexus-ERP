const { Model, DataTypes } = require('sequelize');

/**
 * Tracks refresh-token sessions so users/admins can see active sessions,
 * revoke a single device, or revoke all sessions (e.g. on password change).
 * Access tokens are short-lived JWTs and are never stored; only the
 * long-lived refresh token's hash is persisted here.
 */
module.exports = (sequelize) => {
  class Session extends Model {
    static associate(models) {
      Session.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  Session.init(
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
      school_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      refresh_token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Session',
      tableName: 'sessions',
      underscored: true,
      timestamps: true,
    }
  );

  return Session;
};
