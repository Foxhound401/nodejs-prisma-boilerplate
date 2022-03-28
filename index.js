const app = require('./src/app.js');
const chalk = require('chalk');

const port = process.env.PORT || 3000;

app.listen(port, () =>
  console.log(`\n⛅  App is running on: http://localhost:${chalk.yellow(port)}`)
);
