require('dotenv').config();
const bcrypt = require('bcrypt');
const Pusher = require('pusher');
const { jwt } = require('jsonwebtoken');
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_SECRET_KEY,
  cluster: process.env.PUSHER_CLUSTER_ID,
  useTLS: false,
});

const SALT_ROUNDS = 3;

class UtilsService {
  hashingPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  };

  comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
  };

  getRandomString = (length) => {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  sendEventWithPusher = (data) => {
    pusher
      .trigger('sso-auth', 'auth-event', data)
      .then(console.log)
      .catch((error) => console.log(error));
  };

  isEmailRegex = (content) => {
    // Talk with others team member before change this regex,
    // should extends this function instead of overwrite
    const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return mailRegex.test(content);
  };

  generateToken = async (data) => {
    return jwt.sign({ data: data }, process.env.JWT_SECRET_KEY, {
      expiresIn: '24h',
    });
  };
}

module.exports = UtilsService;
