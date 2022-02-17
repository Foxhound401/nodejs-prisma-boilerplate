const axios = require('axios').default;

const githubConfig = {
  appId: process.env.GITHUB_APP_ID,
  appSecret: process.env.GITHUB_APP_SECRET,
  redirectUrl: `${process.env.DOMAIN}/api/users/signup-github`
};

const getUrl = () => {
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${githubConfig.appId}` +
    `&redirect_uri=${encodeURIComponent(githubConfig.redirectUrl)}` +
    `&state=placeholderString`
  return authUrl
};

const getProfile = async (code) => {
  const accessTokenUrl = `https://github.com/login/oauth/access_token?` +
    `client_id=${githubConfig.appId}` +
    `&redirect_uri=${encodeURIComponent(githubConfig.redirectUrl)}` +
    `&client_secret=${githubConfig.appSecret}` +
    `&code=${encodeURIComponent(code)}`;

  const accessToken = await axios
    // Github require to add a header "Accept: application/json" for the format 
    // of the return data, otherwise it will just be a string
    // https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#response
    .get(accessTokenUrl, {
      headers: {
        Accept: "application/json"
      }
    })
    .then(res => res.data['access_token'])
    .catch(error => {
      console.log("-- GITHUB SERVICE -- FAILED GET ACCESS TOKEN ");
      throw new Error(error.message)
    });

  const githubUser = await axios
    .get(
      `https://api.github.com/user`,
      {
        headers: {
          Authorization: `Bearer ${encodeURIComponent(accessToken)}`
        }
      })
    .then(res => res.data)
    .catch(error => {
      throw new Error(error.message);
    });

  githubUser.access_token = accessToken

  return githubUser;
};

module.exports = {
  getUrl,
  getProfile
}
