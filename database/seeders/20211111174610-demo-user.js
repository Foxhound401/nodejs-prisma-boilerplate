'use strict';
const models = require("../../database/models");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SALT_ROUNDS = 1;

const hashingPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let user = await models.User.findOne({ where: {email:'ops@eastplayers.io'} });
    if (user) return;

    const userPayload = {
      email: 'ops@eastplayers.io',
      // name: 'EP Bot',
      password: '123123'
    }
    const { email, password } = userPayload;
    const hashedPassword = await hashingPassword(password)
    const newUserPayload = Object.assign({}, userPayload, {
      password: hashedPassword,
    })

    let newUser = await models.User.create(newUserPayload)
    user = {
      id: newUser.id,
      // name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      is_verify: true,
    }
    const token = jwt.sign({ user: user }, process.env.JWT_SECRET_KEY);
    let verify_token = Math.random().toString(36).substring(7);
    newUser.token = token;
    newUser.verify_token = verify_token;
    await newUser.save();
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
