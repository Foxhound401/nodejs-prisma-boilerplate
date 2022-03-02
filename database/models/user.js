"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.UsersAccount, {
        as: "usersAccounts",
        foreignKey: "user_id",
      });
    }
  }
  User.init(
    {
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      profile_src: DataTypes.STRING,
      is_verify: { type: DataTypes.BOOLEAN, defaultValue: false },
      otp_code: DataTypes.STRING,
      token: DataTypes.STRING,
      reset_token: DataTypes.STRING,
      is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
      phone_number: { type: DataTypes.STRING },
      username: { type: DataTypes.STRING },
    },
    {
      sequelize,
      modelName: "User",
    }
  );

  return User;
};
