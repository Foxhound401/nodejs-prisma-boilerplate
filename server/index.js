const express = require("express");
const routes = require("../routes");
const cors = require("cors");
const morgan = require("morgan");

const server = express();

server.use(cors());
server.use(express.json());
server.use(morgan());

server.use("/sso", routes);

module.exports = server;
