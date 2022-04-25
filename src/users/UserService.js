const prisma = require('../database/DatabaseService');
const UtilsService = require('../utils/UtilsService');
const jwt = require('jsonwebtoken');
const twilioService = require('../otp/OTPService');
const mailService = require('../email/EmailService');
const socialService = require('../social/SocialService');
const { ErrorCode, HttpStatus } = require('../utils/ErrorCode');

function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

function UserError(httpStatus, errorCode, message) {
  this.success = false;
  this.httpStatus = httpStatus;
  this.errorCode = errorCode;
  this.errorKey = getKeyByValue(ErrorCode, errorCode);
  this.message = message;
}

const MAX_OTP_CHARACTERS = 4;

class UserService {
  constructor() {
    this.utilsService = new UtilsService();
  }

  validPassword(input, query) {
    return this.utilsService.comparePassword(input, query);
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
        cover: true,
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

  generateToken = async (data) => {
    data.token = '';
    return jwt.sign({ data: data }, process.env.JWT_SECRET_KEY, {
      expiresIn: '7d',
    });
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

  verifyOTP = async (emailPhone, otp) => {
    const byPhone = this.utilsService.isEmailRegex(emailPhone)
      ? {
          email: emailPhone,
        }
      : {
          phone_number: emailPhone,
        };

    const user = await prisma.users.findFirst({ where: { ...byPhone } });
    if (!user) {
      throw new UserError(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NON_EXISTED,
        "Can't find user for sending otp"
      );
    }

    if (user.phone_number) {
      const verifiedOTP = await twilioService.verifyOtp(user.phone_number, otp);

      if (verifiedOTP.status !== 'approved' || !verifiedOTP.valid) {
        throw new UserError(
          HttpStatus.BAD_REQUEST,
          ErrorCode.OTP_INVALID,
          'OTP verification failed, Invalid OTP'
        );
      }

      const token = await this.generateToken(user);
      return this.update(user.id, {
        otp_code: otp,
        is_verify: true,
        token: token,
      });
    }

    if (user.otp_code !== otp) {
      throw new UserError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.OTP_INVALID,
        'OTP verification failed, Invalid OTP'
      );
    }

    const token = await this.generateToken(user);
    return this.update(user.id, {
      otp_code: otp,
      is_verify: true,
      token: token,
    });
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
        is_verify: true,
        token: true,
      },
    });
  };

  signin = async (email_phone, password) => {
    const byPhone = this.utilsService.isEmailRegex(email_phone)
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

    if (!existed)
      throw new UserError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.USER_NON_EXISTED,
        'User Not Existed!'
      );

    if (!this.validPassword(password, existed.password))
      throw new UserError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.PASSWORD_INVALID,
        'Password Invalid!'
      );

    if (!existed.is_verify) {
      await this.sendOTP(email_phone);
      throw new UserError(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.USER_NON_VERIFIED,
        'User Not Yet Verified!'
      );
    }

    const token = await this.generateToken(existed);
    return this.update(existed.id, { token });
  };

  signinAdmin = async (email, password) => {
    const existed = await prisma.users.findFirst({
      where: {
        email,
      },
    });

    if (!existed)
      throw new UserError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.USER_NON_EXISTED,
        'User Not Existed!'
      );

    if (!this.validPassword(password, existed.password))
      throw new UserError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.PASSWORD_INVALID,
        'Password Invalid!'
      );

    const token = await this.generateToken(existed);
    return this.update(existed.id, { token });
  };

  signup = async (user) => {
    const byPhone = this.utilsService.isEmailRegex(user.email_phone)
      ? {
          email: user.email_phone,
        }
      : {
          phone_number: user.email_phone,
        };

    const existed = await prisma.users.findFirst({
      where: {
        ...byPhone,
      },
    });

    if (existed)
      throw new UserError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.USER_EXISTED,
        'User Existed!'
      );

    const createdUser = await prisma.users.create({
      data: {
        ...byPhone,
        username: user.username,
        password: user.password,
        account_type: 'default',
        is_verify: false,
        is_admin: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone_number: true,
        avatar: true,
        cover: true,
        account_type: true,
        first_name: true,
        last_name: true,
        created_at: true,
        updated_at: true,
        birthday: true,
        is_admin: true,
        profile_src: true,
        is_verify: true,
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

    await this.sendOTP(user.email_phone);

    return createdUser;
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

  sendOTP = async (emailPhone) => {
    if (!this.utilsService.isEmailRegex(emailPhone))
      return twilioService.sendOtp(emailPhone);

    return this.sendOTPEmail(emailPhone);
  };

  resetOTP = async (emailPhone) => {
    const byPhone = emailPhone.phone_number
      ? {
          phone_number: emailPhone.phone_number,
        }
      : {
          email: emailPhone.email,
        };
    const user = this.findFirst({
      ...byPhone,
    });

    console.log('-----------RESETOTP: ', user);

    if (!user) {
      throw new UserError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.USER_EXISTED,
        'User Not Found, Invalid credentials to resend OTP'
      );
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
      ...byPhone,
    });

    if (!user) throw new Error('User not found!');

    this.sendOTP(emailOrPhone);

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
        created_at: true,
      },
    });

    return userSearch.filter((user) => user.id !== currentUser.id);
  };

  authGoogle = async (user) => {
    // TODO: merge account update is_verify
    const byEmail = user.email
      ? {
          email: user.email,
        }
      : {
          google_user_id: user.google_user_id,
        };
    const searchUser = await this.findFirst(byEmail);

    if (searchUser) {
      searchUser.avatar = user.avatar;
      searchUser.username = user.username;
      searchUser.last_name = user.lastname;
      searchUser.first_name = user.firstname;
      searchUser.is_verify = true;
      searchUser.account_type = 'default';
      const token = await this.generateToken(searchUser);

      // FIXME: when merge every setting before will be delete
      return this.update(searchUser.id, {
        username: user.username,
        avatar: user.avatar,
        last_name: user.lastname,
        first_name: user.firstname,
        token: token,
        is_verify: true,
        account_type: 'default',
        google_user_id: user.google_user_id,
      });
    }

    const createUserDto = {
      email: user.email ? user.email : '',
      username: user.username,
      avatar: user.avatar,
      last_name: user.lastname,
      first_name: user.firstname,
      is_verify: true,
      account_type: 'default',
      google_user_id: user.google_user_id,
    };

    const createdUser = await prisma.users.create({
      data: createUserDto,
      select: {
        id: true,
        username: true,
        email: true,
        phone_number: true,
        avatar: true,
        cover: true,
        account_type: true,
        first_name: true,
        last_name: true,
        created_at: true,
        updated_at: true,
        birthday: true,
        is_admin: true,
        profile_src: true,
        is_verify: true,
        token: true,
      },
    });

    // TODO: implement Observer to relay user
    // This should have observer pattern so that multiple services can
    // subscribe to it and sync the user
    const userSocial = await socialService.createUser(createdUser);

    if (!userSocial) {
      await prisma.users.delete({
        where: { id: createdUser.id },
      });

      await socialService.deleteUser(createdUser.id);

      // console.error('UserService - failed to create social user', social);
      throw new Error('Failed to create user social!');
    }

    console.log('AUTH GOOGLE - Return: ', createdUser);

    const token = await this.generateToken(createdUser);
    return this.update(searchUser.id, {
      token: token,
    });
  };

  authFacebook = async (user) => {
    // TODO: merge account update is_verify
    const byEmail = user.email
      ? {
          email: user.email,
        }
      : {
          facebook_user_id: user.facebook_user_id,
        };
    const searchUser = await this.findFirst(byEmail);

    if (searchUser) {
      searchUser.avatar = user.avatar;
      searchUser.username = user.username;
      searchUser.last_name = user.lastname;
      searchUser.first_name = user.firstname;
      searchUser.is_verify = true;
      searchUser.account_type = 'default';
      const token = await this.generateToken(searchUser);

      return this.update(searchUser.id, {
        username: user.username,
        avatar: user.avatar,
        last_name: user.lastname,
        first_name: user.firstname,
        token: token,
        is_verify: true,
        account_type: 'default',
        facebook_user_id: user.facebook_user_id,
      });
    }

    const createUserDto = {
      email: user.email ? user.email : '',
      username: user.username,
      avatar: user.avatar,
      last_name: user.lastname,
      first_name: user.firstname,
      is_verify: true,
      account_type: 'default',
      facebook_user_id: user.facebook_user_id,
    };

    const createdUser = await prisma.users.create({
      data: createUserDto,
      select: {
        id: true,
        username: true,
        email: true,
        phone_number: true,
        avatar: true,
        cover: true,
        account_type: true,
        first_name: true,
        last_name: true,
        created_at: true,
        updated_at: true,
        birthday: true,
        is_admin: true,
        profile_src: true,
        is_verify: true,
        token: true,
      },
    });

    // TODO: implement Observer to relay user
    // This should have observer pattern so that multiple services can
    // subscribe to it and sync the user
    const userSocial = await socialService.createUser(createdUser);

    if (!userSocial) {
      await prisma.users.delete({
        where: { id: createdUser.id },
      });

      await socialService.deleteUser(createdUser.id);

      throw new Error('Failed to create user social!');
    }

    const token = await this.generateToken(createdUser);
    return this.update(searchUser.id, {
      token: token,
    });
  };
}

module.exports = UserService;
