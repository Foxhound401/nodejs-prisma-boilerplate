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
        birthday: true,
        is_admin: true,
        profile_src: true,
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
      select: {
        id: true,
        email: true,
        token: true,
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

  verifyOTP = async (userId, otp) => {
    const user = await prisma.users.findFirst({ where: { id: userId } });
    if (!user) throw new Error('user not found');

    if (user.phone_number) {
      const verifiedOTP = await twilioService.verifyOtp(user.phone_number, otp);

      if (verifiedOTP.status !== 'approved' || !verifiedOTP.valid)
        throw new Error('OTP invalid, please try again');

      return this.update(user.id, {
        otp_code: otp,
        is_verify: true,
      });
    }

    if (user.otp_code !== otp)
      throw new Error('OTP mismatch, verification failed');

    return this.update(user.id, {
      otp_code: otp,
      is_verify: true,
    });
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
    if (user.id) throw new Error('Cannot update id');
    return prisma.users.update({
      where: { id: id },
      data: {
        ...user,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone_number: true,
        avatar: true,
        cover: true,
        birthday: true,
        first_name: true,
        last_name: true,
        created_at: true,
      },
    });
  };

  signup = async (user) => {
    const { email_phone, password, username } = user;
    const isEmail = this.utilsService.isEmailRegex(email_phone);
    const byPhone = isEmail
      ? {
          email: email_phone,
        }
      : {
          phone_number: email_phone,
        };

    const existed = await prisma.users.findFirst({
      where: {
        ...byPhone,
      },
    });

    if (existed) throw new Error('User already existed!');

    const createdUser = await prisma.users.create({
      data: {
        ...byPhone,
        username: username,
        password: password,
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

      const social = await socialService.deleteUser(createdUser.id);

      console.error('UserService - failed to create social user', social);
      throw new Error('Failed to create user social!');
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
        phone_number: true,
        username: true,
        account_type: true,
        token: true,
      },
    });
    if (!updateToken) throw new Error('Failed to create Token');

    if (!isEmail) {
      await twilioService.sendOtp(email_phone);
      return updateToken;
    }

    await this.sendOTPEmail(email_phone);

    return updateToken;
  };

  getCurrentUser = async (userId) => {
    if (!userId) throw new Error('user id not found');
    return prisma.users.findFirst({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone_number: true,
        avatar: true,
        cover: true,
        first_name: true,
        last_name: true,
        created_at: true,
        birthday: true,
      },
    });
  };

  sendOTPToVerifyResetPasswordRequest = async (emailOrPhone) => {
    const byPhone = emailOrPhone.phone_number
      ? {
          phone_number: emailOrPhone.phone_number,
        }
      : {
          email: emailOrPhone.email,
        };

    const user = await prisma.users.findFirst({
      where: {
        ...byPhone,
      },
    });

    if (!user) throw new Error('User not Found!');

    if (emailOrPhone.phone_number) {
      twilioService.sendOtp(user.phone_number);
    } else {
      this.sendOTPEmail(user.email);
    }

    return;
  };

  resendOTPForResetPasswordRequest = async (emailOrPhone) => {
    const byPhone = emailOrPhone.phone_number
      ? {
          phone_number: emailOrPhone.phone_number,
        }
      : {
          email: emailOrPhone.email,
        };
    const user = this.findFirst({
      where: {
        ...byPhone,
      },
    });

    if (!user) throw new Error('User not found!');

    if (user.phone_number) {
      twilioService.sendOtp(user.phone_number);
    } else {
      this.sendOTPEmail(user.email);
    }

    return;
  };

  resetPassword = async (email_phone, new_hashed_password) => {
    const isEmail = this.utilsService.isEmailRegex(email_phone);
    const query = isEmail
      ? {
          email: email_phone,
        }
      : {
          phone_number: email_phone,
        };

    const user = await prisma.users.findFirst({
      where: {
        ...query,
      },
    });
    if (!user) throw new Error('User not Found');

    return prisma.users.update({
      where: { id: user.id },
      data: {
        password: new_hashed_password,
      },
      select: {
        id: true,
      },
    });
  };

  verifyResetPasswordOTP = async (email_phone, otp) => {
    const isEmail = this.utilsService.isEmailRegex(email_phone);
    const query = isEmail
      ? {
          email: email_phone,
        }
      : {
          phone_number: email_phone,
        };

    const user = await prisma.users.findFirst({
      where: {
        ...query,
      },
    });
    if (!user) throw new Error('User not Found');

    if (!isEmail) {
      const verifiedOTP = await twilioService.verifyOtp(email_phone, otp);
      if (verifiedOTP.status !== 'approved' || !verifiedOTP.valid)
        throw new Error('OTP invalid, please try again');

      return this.update(user.id, {
        otp_code: otp,
        is_verify: true,
      });
    }

    if (user.otp_code !== otp)
      throw new Error('OTP mismatch, verification failed');

    return this.update(user.id, {
      otp_code: otp,
      is_verify: true,
    });
  };

  delete = async (userId) => {
    const socialResp = await socialService.deleteUser(userId);

    if (!socialResp) throw new Error('Delete social user failed');

    return prisma.users.delete({
      where: { id: userId },
      select: { id: true },
    });
  };

  search = async (userId, searchInput) => {
    const currentUser = await prisma.users.findFirst({
      where: {
        id: userId,
      },
    });

    const userSearch = await prisma.users.findMany({
      where: {
        OR: [
          {
            email: {
              contains: searchInput,
            },
          },
          {
            phone_number: {
              contains: searchInput,
            },
          },
        ],
      },
      select: {
        id: true,
        avatar: true,
        username: true,
        cover: true,
        email: true,
        phone_number: true,
      },
    });

    return userSearch.filter((user) => user.id !== currentUser.id);
  };
}

module.exports = UserService;
