require('dotenv').config();
const Api = require('../utils/axios');

const createUser = async (user) => {
  try {
    console.log('SOCIAL SERVICE:', user);
    const res = await Api({
      url: '/users',
      data: {
        name: user.username,
        type: user.account_type ? user.account_type : 'default',
        system_user_id: user.id,
      },
    });
    // console.log(res);

    return res;
  } catch (error) {
    throw error;
  }
};

const deleteUser = async (system_user_id) => {
  try {
    const res = await Api({
      url: '/users',
      method: 'DELETE',
      data: {
        system_user_id,
      },
    });

    return res;
  } catch (error) {
    throw error;
  }
};

const updateUserAvatar = async (system_user_id, avatar) => {
  try {
    const res = await Api({
      url: '/users',
      method: 'PUT',
      data: {
        system_user_id,
        data: {
          ...avatar,
        },
      },
    });

    return res;
  } catch (error) {
    throw error;
  }
};

const updateUserCover = async (system_user_id, cover) => {
  try {
    const res = await Api({
      url: '/users',
      method: 'PUT',
      data: {
        system_user_id,
        data: {
          ...cover,
        },
      },
    });

    return res;
  } catch (error) {
    throw error;
  }
};

const getUserDetail = async (system_user_id) => {
  try {
    const res = await Api({
      url: `/users/oa/${system_user_id}`,
      method: 'GET',
    });

    return res;
  } catch (error) {
    throw error;
  }
};

const updateUserDetail = async (system_user_id, user) => {
  try {
    const res = await Api({
      url: `/users/oa/${system_user_id}`,
      method: 'PUT',
      data: {
        user,
      },
    });

    return res;
  } catch (error) {
    throw error;
  }
};

const deleteUserDetail = async (system_user_id) => {
  try {
    const res = await Api({
      url: `/users/oa/${system_user_id}`,
      method: 'DELETE',
    });

    return res;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createUser,
  deleteUser,
  updateUserAvatar,
  updateUserCover,
  getUserDetail,
  updateUserDetail,
};
