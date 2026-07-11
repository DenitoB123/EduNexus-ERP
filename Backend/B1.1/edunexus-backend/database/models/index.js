const fs = require('fs');
const path = require('path');
const sequelize = require('../connection');

const basename = path.basename(__filename);
const db = {};

/**
 * Auto-loads every *.model.js file in this directory, initializes it
 * against the shared sequelize instance, then wires up associations
 * via each model's static associate(models) method.
 */
fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith('.model.js'))
  .forEach((file) => {
    const modelDef = require(path.join(__dirname, file));
    const model = modelDef(sequelize);
    db[model.name] = model;
  });

Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;
