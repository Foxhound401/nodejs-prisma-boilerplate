const prisma = require('../database/DatabaseService');
const UtilsService = require('../utils/UtilsService');
const jwt = require('jsonwebtoken');
const twilioService = require('../otp/OTPService');
const mailService = require('../email/EmailService');
const socialService = require('../social/SocialService');

const MAX_OTP_CHARACTERS = 4;

class UserService {
  constructor() {
    this.utilsService = new UtilsService();
  }

  findFirst = async (query) => {
    return prisma.users.findFirst({
      where: {
        ...query,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone_number: true,
        avatar: true,
        account_type: true,
        first_name: true,
        last_name: true,
        created_at: true,
        updated_at: true,
      },
    });
  };

  generateOTP = (max = MAX_OTP_CHARACTERS) => {
    return this.utilsService.getRandomString(max);
  };

  getNewToken = async (existedUser) => {
    let user = {
      id: existedUser.id,
      email: existedUser.email,
      password: await this.utilsService.hashingPassword(new Date().toString()),
      createdAt: existedUser.createdAt,
      updatedAt: existedUser.updatedAt,
    };
    return jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
      expiresIn: '24h',
    });
  };

  signInWithEmail = async (email, password) => {
    const user = await prisma.users.findFirst({
      where: { email: email },
    });

    if (!user) throw new Error('User Not Found!');

    const validPassword = await this.utilsService.comparePassword(
      password,
      user.password
    );

    if (!validPassword) throw new Error('Wrong username or password!');

    user.token = '';
    const token = jwt.sign({ data: user }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });

    return prisma.users.update({
      where: { id: user.id },
      data: {
        token: token,
      },
      select: {
        id: true,
        email: true,
        token: true,
      },
    });
  };

  signInWithPhone = async (phone_number, password) => {
    const user = await prisma.users.findFirst({
      where: {
        id: true,
        email: true,
        phone_number: phone_number,
      },
    });

    if (!user) throw new Error('User not Found!');

    const validPassword = await this.utilsService.comparePassword(
      password,
      user.password
    );

    if (!validPassword) throw new Error('Wrong username or password!');

    user.token = '';
    const token = jwt.sign({ data: user }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });

    return prisma.users.update({
      where: { id: user.id },
      data: {
        token: token,
      },
    });
  };

  getAllUsers = async (req, res) => {
    try {
      const users = await this.list();
      return res.status(200).json({ users });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  };

  getUserById = async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await this.firstRow({ id: userId });
      if (user) {
        return res.status(200).json({ user });
      }
      return res.status(404).send('user with the specified ID does not exists');
    } catch (error) {
      return res.status(500).send(error.message);
    }
  };

  updateUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const [updated] = await this.update(req.body, { id: userId });
      if (updated) {
        const updatedUser = await this.firstRow({ id: userId });
        return res.status(200).json({ post: updatedUser });
      }
      throw new Error('User not found');
    } catch (error) {
      return res.status(500).send(error.message);
    }
  };

  deleteUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const deleted = await this.delete({ id: userId });
      if (deleted) {
        return res.status(204).send('User deleted');
      }
      throw new Error('User not found');
    } catch (error) {
      return res.status(500).send(error.message);
    }
  };

  sendForgetPasswordLink = async (email) => {
    const user = await this.firstRow({ email: email });
    if (!user) return { error: 'Email or username not found!' };

    let r = Math.random().toString(36).substring(7);
    user.reset_token = r;
    await user.save();
    const confirm_url =
      'https' +
      process.env.DOMAIN +
      '/sso/users/reset-password-email?email=' +
      user.email +
      '&reset_token=' +
      r;
    try {
      const data = mailService.sendForgotMail(user.email, confirm_url);
      return data;
    } catch (error) {
      throw error;
    }
  };

  sendForgetPasswordResetCode = async (email) => {
    const user = await this.firstRow({ email: email });
    if (!user) return { error: 'Email or username not found!' };

    const reset_code = Math.floor(100000 + Math.random() * 900000);
    user.reset_token = reset_code;

    try {
      const saveUser = await user.save();
      if (!saveUser) return { error: 'Failed to generate Reset Code' };

      await mailService.sendForgotResetCode(user.email, reset_code);
    } catch (error) {
      throw error;
    }
  };

  sendOTPEmail = async (email) => {
    const user = await prisma.users.findFirst({
      where: { email: email },
    });

    if (!user) return { error: 'Email or username not found!' };

    try {
      const otp = Math.floor(100000 + Math.random() * 900000);
      const saveUser = await prisma.users.update({
        where: { id: user.id },
        data: {
          otp_code: `${otp}`,
        },
      });

      if (!saveUser) return { error: 'Failed to generate OTP' };

      await mailService.sendOTPEmail(user.email, otp);
    } catch (error) {
      throw error;
    }
  };

  verifyOTPEmail = async (email, otp_code) => {
    try {
      const user = await prisma.users.findFirst({
        where: {
          email: email,
        },
      });
      if (!user) return { error: 'User Not found!!!' };

      if (user.otp_code === otp_code) {
        return await prisma.users.update({
          where: { id: user.id },
          data: {
            is_verify: true,
          },
        });
      }

      return { error: 'Wrong OTP' };
    } catch (error) {
      throw error;
    }
  };

  verifyOTPPhone = async (phone_number, otp_code) => {
    try {
      const user = await prisma.users.findFirst({
        where: {
          phone_number: phone_number,
        },
      });
      if (!user) return { error: 'User Not found!!!' };

      const verifiedOTP = await verifyOtp(phone_number, otp);
      if (verifiedOTP !== 'approved' && verifiedOTP.valid) {
        return await this.userService.update(user.id, {
          otp_code: otp,
          is_verify: true,
        });
      }

      return { error: 'Wrong OTP' };
    } catch (error) {
      throw error;
    }
  };

  resetPasswordEmail = async (email, reset_token, new_password) => {
    const user = await this.firstRow({ email: email });
    if (user && user.reset_token === reset_token) {
      const hashedPassword = await this.utilsService.hashingPassword(
        new_password
      );
      user.password = hashedPassword;
      await user.save();
      return { success: 1 };
    } else {
      return { success: 0 };
    }
  };

  getUserListByConditions = async (conditions) => {
    try {
      const users = await this.list(conditions);
      return users;
    } catch (error) {
      return [];
    }
  };

  signupWithSms = async (email, otp, phoneNumber) => {
    try {
      const verifyOtp = await twilioService.verifyOtp(phoneNumber, otp);

      if (verifyOtp.status === 'approved' && verifyOtp.valid) {
        const user = await this.firstRow({ email });

        if (user) {
          if (!phoneNumber && !otp) {
            return { error: 'account already registed with different method' };
          }

          const newToken = jwt.sign(
            { user: user },
            process.env.JWT_SECRET_KEY,
            {
              expiresIn: '7d',
            }
          );

          user.token = newToken;
          user.save();
          console.log('EMAIL IN IF: ', email);

          const { token, is_admin } = user;

          console.log('EMAIL IN IF: ', email);

          const result = {
            email,
            token,
            is_admin,
            avatar: '',
            name: '',
            firstname: '',
            lastname: '',
            account_type: 'twilio',
          };

          return result;
        } else {
          const createUser = await this.create({
            email,
          });

          const newToken = jwt.sign(
            { user: createUser },
            process.env.JWT_SECRET_KEY,
            {
              expiresIn: '7d',
            }
          );

          createUser.token = newToken;
          createUser.save();

          const usersAccount = await this.usersAccountService.create({
            account_type: 'twilio',
            phone_number: phoneNumber,
            user_id: createUser.id,
          });

          const { token } = createUser;
          const { account_type } = usersAccount;
          if (createUser && usersAccount) {
            const result = {
              email,
              avatar: '',
              name: '',
              firstname: '',
              lastname: '',
              account_type,
              token,
            };
            return result;
          } else {
            return { error: 'signup failed due to server error!' };
          }
        }
      } else {
        return { error: 'failed to verify otp' };
      }
    } catch (error) {
      return {
        error: error.message,
        message: 'signupWithSms | userService',
      };
    }
  };

  update = async (id, user) => {
    const updateUser = await prisma.users.update({
      where: { id: id },
      data: user,
    });
  };

  signup = async (user) => {
    const byPhone = user.phone_number
      ? {
          phone_number: user.phone_number,
        }
      : {
          email: user.email,
        };

    const existed = await prisma.users.findFirst({
      where: {
        ...byPhone,
      },
    });

    if (existed) throw new Error('User already existed!');

    const createdUser = await prisma.users.create({
      data: {
        ...user,
        account_type: 'default',
      },
      select: {
        id: true,
        email: true,
        username: true,
        account_type: true,
      },
    });
    if (!createdUser) throw new Error('Failed to create user!');

    // TODO: implement Observer to relay user
    // This should have observer pattern so that multiple services can
    // subscribe to it and sync the user
    const userSocial = await socialService.createUser(createdUser);

    if (!userSocial) {
      await prisma.users.delete({
        where: { id: createdUser.id },
      });

      await socialService.deleteUser(createdUser.id);

      throw new Error('Failed to create user!');
    }

    const token = jwt.sign({ data: createdUser }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });

    const updateToken = await prisma.users.update({
      where: { id: createdUser.id },
      data: { token: token },
      select: {
        id: true,
        email: true,
        username: true,
        account_type: true,
        token: true,
      },
    });
    if (!updateToken) throw new Error('Failed to create Token');

    if (user.phone_number) {
      twilioService.sendOtp(user.phone_number);
    } else {
      this.sendOTPEmail(user.email);
    }

    return updateToken;
  };
}

module.exports = UserService;
