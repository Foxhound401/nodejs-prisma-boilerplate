const express = require("express");
const routes = require("../routes");
const cors = require("cors");
const morgan = require("morgan");
const winston = require("../config/winston");

const server = express();

server.use(cors());
server.use(express.json());
server.use(morgan("combined", { stream: winston.stream }));

server.use("/sso/v1", routes);

module.exports = server;
