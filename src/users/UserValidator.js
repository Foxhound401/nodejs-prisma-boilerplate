const { object, string, number } = require('yup');

const signUp = object({
  email_phone: string().required().lowercase().trim().min(1),
  password: string().required().lowercase().trim().min(8),
  username: string().required().lowercase().trim().min(6),
});

const signIn = object({
  email_phone: string().required().lowercase().trim().min(1),
  password: string().required().lowercase().trim().min(8),
});

module.exports = { signUp, signIn };
