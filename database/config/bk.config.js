require('dotenv').config();

module.exports = {
    development: {
        url: process.env.DEV_DATABASE_URL,
        dialect: 'postgres',
        dialectOptions: {
            requestTimeout: 3000
        },
    },
    test: {
        url: process.env.TEST_DATABASE_URL,
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false // <<<<<<< YOU NEED THIS
            }
        }
    },
    production: {
        url: process.env.DATABASE_URL,
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false // <<<<<<< YOU NEED THIS
            }
        }
    },
};
