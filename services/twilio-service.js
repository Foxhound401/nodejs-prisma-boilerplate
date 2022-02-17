const axios = require('axios').default;
const twilio = require('twilio');

const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  serviceSid: "VA9eba185f78e071899b621031264fa8f5"
}

const client = new twilio(twilioConfig.accountSid, twilioConfig.authToken);

const sendOtp = async (phoneNumber) => {
  const verification = await client.verify.services(twilioConfig.serviceSid)
    .verifications
    .create({ to: phoneNumber, channel: 'sms' })

  if (verification) {
    return verification;
  } else {
    return {
      message: "failed to send otp",
      error: verification
    }
  }
}

const verifyOtp = async (phoneNumber, otp) => {
  const verificationCheck = await client.verify.services(twilioConfig.serviceSid)
    .verificationChecks
    .create({ to: phoneNumber, code: otp })

  if (verificationCheck) {
    return verificationCheck
  } else {
    return {
      message: "faield to check otp",
      error: verificationCheck
    }
  }
}

module.exports = {
  sendOtp,
  verifyOtp
}
