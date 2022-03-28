const express = require('express');
const router = require('./route');
const morgan = require('morgan');
const winston = require('./utils/winston');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: winston.stream }));

app.use('/sso', router);

module.exports = app;
