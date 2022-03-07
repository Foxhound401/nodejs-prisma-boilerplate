require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
    native: false,
    dialectOptions: {
      requestTimeout: 3000,
      ssl: false,
    },
  },
  test: {
    url: process.env.TEST_DATABASE_URL,
    dialect: "postgres",
    native: false,
    dialectOptions: {
      ssl: {
        require: false,
        rejectUnauthorized: false, // <<<<<<< YOU NEED THIS
      },
    },
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: false,
        rejectUnauthorized: false, // <<<<<<< YOU NEED THIS
      },
    },
  },
};
