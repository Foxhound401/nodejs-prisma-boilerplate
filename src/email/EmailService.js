const DOMAIN = process.env.DOMAIN;
const API_KEY = process.env.MAILGUN_API_KEY;

const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: 'api', key: API_KEY });

const sendConfirmRegisterMail = async (email, confirm_url) => {
  const data = {
    from: 'Contact <hello@moospy.eastplayers.io>',
    to: email,
    subject: 'Successfully sign up!',
    template: 'register_account_email_template',
    'v:confirm_url': confirm_url,
  };

  await mg.messages.create(DOMAIN, data).catch((error) => {
    throw error;
  });
};

const sendForgotMail = async (email, confirm_url) => {
  const data = {
    from: 'Contact <hello@eastplayers.io>',
    to: email,
    subject: 'Reset Password',
    template: 'forgot_password_template',
    'v:confirm_url': confirm_url,
  };

  mg.messages.create(DOMAIN, data).catch((error) => {
    throw error;
  });
};

const sendForgotResetCode = async (email, reset_code) => {
  const data = {
    from: 'Contact <hello@eastplayers.io>',
    to: email,
    subject: 'Reset Code',
    template: 'forgot_password_reset_code_template',
    'v:reset_code': reset_code,
  };

  mg.messages.create(DOMAIN, data).catch((error) => {
    throw error;
  });
};

const sendOTPEmail = async (email, otp) => {
  const data = {
    from: 'Contact <hello@eastplayers.io>',
    to: email,
    subject: 'Verify Code',
    template: 'verify_code_email_template',
    'v:otp': otp,
  };

  mg.messages.create(DOMAIN, data).catch((error) => {
    throw error;
  });
};

const sendDowngradePlan = async (email) => {
  const data = {
    from: 'Contact <hello@moospy.eastplayers.io>',
    to: email,
    subject: 'Your account is downgraded to Trial Plan',
    template: 'downgraded_plan_template',
  };

  await mg.messages.create(DOMAIN, data).catch((error) => {
    throw error;
  });
};

const sendNotifyAdmin = async (email, new_info) => {
  const data = {
    from: 'Contact <hello@moospy.eastplayers.io>',
    to: email,
    subject: 'You have new contact',
    html: `<p>Email: ${new_info.email}</p>
        <p>Name: ${new_info.name}</p>
        <p>Phone number: ${new_info.phonenumber}</p>
        <p>Message: ${new_info.message}</p>`,
  };

  await mg.messages.create(DOMAIN, data).catch((error) => {
    throw error;
  });
};

const sendOTP = async (email, otp) => {
  const data = {
    from: 'Wisepass <hello@wisepass.co>',
    to: email,
    subject: 'OTP is generated',
    html: `<p>OTP: ${otp}</p>`,
  };

  mg.messages.create(DOMAIN, data).catch((error) => {
    throw error;
  });
};

module.exports = {
  sendConfirmRegisterMail,
  sendForgotMail,
  sendDowngradePlan,
  sendNotifyAdmin,
  sendOTP,
  sendForgotResetCode,
  sendOTPEmail,
};
