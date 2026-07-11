const env = require('./env');

/**
 * sequelize-cli reads this file (via .sequelizerc) to run migrations/seeders.
 * The same values are used to construct the Sequelize instance in database/connection.js
 */
module.exports = {
  development: {
    username: env.db.user,
    password: env.db.password,
    database: env.db.name,
    host: env.db.host,
    port: env.db.port,
    dialect: env.db.dialect,
    logging: env.db.logging,
  },
  test: {
    username: env.db.user,
    password: env.db.password,
    database: `${env.db.name}_test`,
    host: env.db.host,
    port: env.db.port,
    dialect: env.db.dialect,
    logging: false,
  },
  production: {
    username: env.db.user,
    password: env.db.password,
    database: env.db.name,
    host: env.db.host,
    port: env.db.port,
    dialect: env.db.dialect,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
