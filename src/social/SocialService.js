require('dotenv').config();
const Api = require('../utils/axios');

const createUser = async (user) => {
  try {
    const res = await Api({
      url: '/users',
      data: {
        name: user.username,
        type: 'default',
        system_user_id: user.id,
      },
    });
    console.log(res);

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

module.exports = {
  createUser,
  deleteUser,
};
