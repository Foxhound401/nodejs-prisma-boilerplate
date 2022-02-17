'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('UsersAccounts', 'access_token', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('UsersAccounts', 'access_token', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
    ]);
  }
};

