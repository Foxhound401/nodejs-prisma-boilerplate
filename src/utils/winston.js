const winston = require('winston');

let logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'sso-service' },
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

logger.stream = {
  write: function(message, encoding) {
    logger.info(message.slice(0, -1))
  }
};

module.exports = logger;
