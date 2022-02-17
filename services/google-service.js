const { google } = require('googleapis');
const axios = require('axios');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.DOMAIN}/api/users/signup-google`
);

const getUrl = async () => {
    const scopes = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes
    });
};

const getProfile = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);

    const googleUser = await axios
        .get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`,
            {
                headers: {
                    Authorization: `Bearer ${tokens.id_token}`
                }
            }
        )
        .then(res => res.data)
        .catch(error => {
            throw new Error(error.message);
        });

    googleUser.access_token = tokens.access_token
    return googleUser
};

module.exports = {
    getUrl,
    getProfile
}
