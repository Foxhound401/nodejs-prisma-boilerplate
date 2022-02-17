'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UsersAccounts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      // user_id: {
      //   type: Sequelize.STRING
      // },
      account_type: {
        type: Sequelize.STRING
      },
      authentication: {
        type: Sequelize.STRING
      },
      avatar: {
        type: Sequelize.TEXT
      },
      name: {
        type: Sequelize.STRING
      },
      firstname: {
        type: Sequelize.STRING
      },
      lastname: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    await queryInterface.addColumn(
      'UsersAccounts',
      'user_id',
      {
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('UsersAccounts');
    await queryInterface.removeColumn(
      'UsersAccounts',
      'user_id'
    )
  }
};
