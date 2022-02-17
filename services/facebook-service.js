const axios = require('axios');

const facebookConfig = {
  appId: process.env.FACEBOOK_APP_ID,
  appSecret: process.env.FACEBOOK_APP_SECRET,
  redirectUrl: `${process.env.DOMAIN}/api/users/signup-facebook`
};

const getUrl = () => {
  const authUrl = `https://www.facebook.com/v12.0/dialog/oauth?` +
    `client_id=${facebookConfig.appId}` +
    `&redirect_uri=${encodeURIComponent(facebookConfig.redirectUrl)}` +
    `&state=placeholderString` +
    `&auth_type=rerequest` +
    `&scope=email`;
  return authUrl
};

const getProfile = async (code) => {
  const accessTokenUrl = `https://graph.facebook.com/v12.0/oauth/access_token?` +
    `client_id=${facebookConfig.appId}` +
    `&redirect_uri=${encodeURIComponent(facebookConfig.redirectUrl)}` +
    `&client_secret=${facebookConfig.appSecret}` +
    `&code=${encodeURIComponent(code)}`;

  const accessToken = await axios
    .get(accessTokenUrl)
    .then(res => res.data['access_token'])
    .catch(error => {
      console.log("FAILED HERE")
      throw new Error(error.message)
    });

  const facebookUser = await axios
    .get(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture{url},name`,
      {
        headers: {
          Authorization: `Bearer ${encodeURIComponent(accessToken)}`
        }
      })
    .then(res => res.data)
    .catch(error => {
      throw new Error(error.message);
    });

  facebookUser.access_token = accessToken

  console.log("FACEBOOK USER", facebookUser)
  return facebookUser;
};

module.exports = {
  getUrl,
  getProfile
}

