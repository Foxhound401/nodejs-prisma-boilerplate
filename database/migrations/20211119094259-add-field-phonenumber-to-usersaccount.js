'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('UsersAccounts', 'phone_number', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('UsersAccounts', 'phone_number', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
    ]);
  }
};
