'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UsersAccount extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.User, {
        foreignKey: "user_id",
      });
    }
  };
  UsersAccount.init({
    account_type: DataTypes.STRING,
    authentication: DataTypes.STRING,
    avatar: DataTypes.TEXT,
    name: DataTypes.STRING,
    firstname: DataTypes.STRING,
    lastname: DataTypes.STRING,
    access_token: DataTypes.TEXT,
    phone_number: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'UsersAccount',
  });

  return UsersAccount;
};
