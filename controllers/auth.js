const googleService = require("../services/google-service.js");
const facebookService = require("../services/facebook-service");
const githubService = require("../services/github-service");
const twilioService = require("../services/twilio-service");

const auth = async (req, res) => {
    try {
        return res.status(201).json({
            user: req.user,
            status: 'success'
        })
    } catch (error) {
        console.log("catch error");
        console.log(error);
        return res.status(400).json({ error: error.message })
    }
}

const sendOtpTwilio = async (req, res) => {
    try {
        const { phoneNumber } = req.body
        // TODO: validate the number with format follow E.164 document
        // https://www.twilio.com/docs/glossary/what-e164

        await twilioService.sendOtp(phoneNumber);

        return res.status(201).json({
            message: "Otp sent!!"
        });
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

const getGoogleAuthUrl = async (req, res) => {
    try {
        const url = await googleService.getUrl()
        return res.status(201).json({ data: url });
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

const getFacebookAuthUrl = (req, res) => {
    try {
        const url = facebookService.getUrl()
        return res.status(201).json({ data: url });
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

const getGithubAuthUrl = (req, res) => {
    try {
        const url = githubService.getUrl()
        return res.status(201).json({ data: url });
    } catch (error) {
        return res.status(400).json({ error: error.message })
    }
}

module.exports = {
    auth,
    getGoogleAuthUrl,
    getFacebookAuthUrl,
    getGithubAuthUrl,
    sendOtpTwilio
};
