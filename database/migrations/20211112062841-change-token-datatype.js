'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('Users', 'token', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      queryInterface.changeColumn('Users', 'reset_token', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
    ])
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('Users', 'token', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn('Users', 'reset_token', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
    ])
  }
};
