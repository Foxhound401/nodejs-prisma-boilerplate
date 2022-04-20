require('dotenv').config();
const axios = require('axios').default;
const baseUrl = process.env.SOCIAL_URL;

const instance = axios.create({
  baseURL: baseUrl,
  timeout: 30000,
  validateStatus: (status) => status < 400,
});

instance.interceptors.request.use(
  async (config) => {
    // TODO: send bearer token along
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => {
    // console.log(
    //   '%c Response Success:',
    //   'color: #4CAF50; font-weight: bold',
    //   response
    // );
    return response;
  },
  (error) => {
    console.log(
      '%c Response error:',
      'color: #4CAF50; font-weight: bold',
      error
    );
    return Promise.reject(error);
  }
);

const Api = async ({ url, method = 'POST', data, params, responseType }) => {
  return instance
    .request({
      method,
      url,
      data,
      params,
      responseType,
    })
    .then((res) => {
      return res.data?.data;
    })
    .catch((error) => {
      throw error;
    });
};

module.exports = Api;
