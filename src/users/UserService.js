const prisma = require('../database/DatabaseService');
const UtilsService = require('../utils/UtilsService');
const jwt = require('jsonwebtoken');
const twilioService = require('../otp/OTPService');
const mailService = require('../email/EmailService');
const socialService = require('../social/SocialService');
const { ErrorCode, HttpStatus } = require('../utils/ErrorCode');
const Result = require('../utils/Result');

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

  //TODO: Remove this code, since it not use
  sendForgetPasswordResetCode = async (email) => {
    const user = await this.firstRow({ email: email });
    if (!user)
      return Result.fail({
        statusCode: HttpStatus.OK,
        errorCode: ErrorCode.USER_NON_EXISTED,
        message: 'USER_NON_EXISTED',
      });

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
          email: emailPhone.toLowerCase(),
        }
      : {
          phone_number: emailPhone.toLowerCase(),
        };

    const user = await prisma.users.findFirst({ where: { ...byPhone } });

    console.log('VERIFY_OTP_FIND_USER', user);

    if (!user)
      return Result.fail({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: ErrorCode.USER_NON_EXISTED,
        message: 'USER_NON_EXISTED',
      });

    if (user.phone_number) {
      const verifiedOTP = await twilioService.verifyOtp(user.phone_number, otp);

      if (verifiedOTP.status !== 'approved' || !verifiedOTP.valid) {
        return Result.fail({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.OTP_INVALID,
          message: 'OTP_INVALID',
        });
      }

      const token = await this.generateToken(user);
      return this.update(user.id, {
        otp_code: otp,
        is_verify: true,
        token: token,
      });
    }

    console.log('OTP_CODE: ', user.otp_code);
    console.log('OTP_CODE: ', otp);

    if (user.otp_code !== otp) {
      return Result.fail({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCode.OTP_INVALID,
        message: 'OTP_INVALID',
      });
    }

    const token = await this.generateToken(user);
    const updatedUser = await this.update(user.id, {
      otp_code: otp,
      is_verify: true,
      token: token,
    });

    console.log('VERIFIED USER: ', updatedUser);

    return Result.ok({
      statusCode: HttpStatus.OK,
      data: {
        ...updatedUser,
      },
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
      return Result.fail({
        statusCode: HttpStatus.OK,
        errorCode: ErrorCode.USER_NON_EXISTED,
        message: 'USER_NON_EXISTED',
      });

    const validPassword = await this.validPassword(password, existed.password);
    if (!validPassword)
      return Result.fail({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCode.PASSWORD_INVALID,
        message: 'PASSWORD_INVALID',
      });

    if (!existed.is_verify) {
      await this.sendOTP(email_phone);
      return Result.fail({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCode.USER_NON_VERIFIED,
        message: 'USER_NON_VERIFIED',
      });
    }

    const token = await this.generateToken(existed);
    const updatedUser = await this.update(existed.id, { token });
    return Result.ok({
      statusCode: HttpStatus.OK,
      data: {
        ...updatedUser,
      },
    });
  };

  signinAdmin = async (email, password) => {
    const existed = await prisma.users.findFirst({
      where: {
        email,
      },
    });

    if (!existed)
      return Result.fail({
        statusCode: HttpStatus.OK,
        errorCode: ErrorCode.USER_NON_EXISTED,
        message: 'USER_NON_EXISTED',
      });

    if (!this.validPassword(password, existed.password))
      return Result.fail({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCode.PASSWORD_INVALID,
        message: 'PASSWORD_INVALID',
      });

    const token = await this.generateToken(existed);
    const updatedUser = await this.update(existed.id, { token });
    return Result.ok({
      statusCode: HttpStatus.OK,
      data: { ...updatedUser },
    });
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
      return Result.fail({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCode.USER_EXISTED,
        message: 'USER_EXISTED',
      });

    const createdUser = await prisma.users.create({
      data: {
        ...byPhone,
        username: user.username,
        password: user.password,
        account_type: 'default',
        is_verify: false,
        is_admin: false,
      },
    });

    if (!createdUser) {
      return Result.fail({
        statusCode: HttpStatus.BAD_REQUEST,
        // errorCode: ErrorCode.OTP_INVALID,
        message: 'CREATE_USER_FAILED',
      });
    }

    // TODO: implement Observer to relay user
    // This should have observer pattern so that multiple services can
    // subscribe to it and sync the user

    const userSocial = await socialService.createUser(createdUser);

    if (!userSocial) {
      await prisma.users.delete({
        where: { id: createdUser.id },
      });

      return Result.fail({
        statusCode: HttpStatus.BAD_REQUEST,
        // errorCode: ErrorCode.OTP_INVALID,
        message: 'CREATE_USER_FAILED',
      });
    }

    await this.sendOTP(user.email_phone);

    return Result.ok({
      statusCode: HttpStatus.OK,
      data: {
        ...createdUser,
      },
    });
  };

  getCurrentUser = async (userId) => {
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

  resendOTP = async (emailPhone) => {
    const byPhone = this.utilsService.isEmailRegex(emailPhone)
      ? {
          email: emailPhone,
        }
      : {
          phone_number: emailPhone,
        };
    const user = await this.findFirst({
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

    return this.sendOTP(emailPhone);
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
    const byPhone = this.utilsService.isEmailRegex(emailOrPhone)
      ? {
          email: emailOrPhone,
        }
      : {
          phone_number: emailOrPhone,
        };

    const user = await prisma.users.findFirst({
      where: {
        ...byPhone,
      },
    });

    if (!user) {
      throw new UserError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.USER_NON_EXISTED,
        'User Not Existed!'
      );
    }

    await this.sendOTP(emailOrPhone);

    return;
  };

  resendOTPForResetPasswordRequest = async (emailOrPhone) => {
    const byPhone = this.utilsService.isEmailRegex(emailOrPhone)
      ? {
          email: emailOrPhone,
        }
      : {
          phone_number: emailOrPhone,
        };

    const user = this.findFirst({
      ...byPhone,
    });

    if (!user) throw new Error('User not found!');

    this.sendOTP(emailOrPhone);

    return;
  };

  resetPassword = async (emailPhone, new_hashed_password) => {
    const isEmail = this.utilsService.isEmailRegex(emailPhone);
    const query = isEmail
      ? {
          email: emailPhone,
        }
      : {
          phone_number: emailPhone,
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

  verifyResetPasswordOTP = async (emailPhone, otp) => {
    const isEmail = this.utilsService.isEmailRegex(emailPhone);
    const query = isEmail
      ? {
          email: emailPhone,
        }
      : {
          phone_number: emailPhone,
        };

    const user = await prisma.users.findFirst({
      where: {
        ...query,
      },
    });
    if (!user) throw new Error('User not Found');

    if (!isEmail) {
      const verifiedOTP = await twilioService.verifyOtp(emailPhone, otp);
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
    return this.update(createdUser.id, {
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
    return this.update(createdUser.id, {
      token: token,
    });
  };

  create = async (email, password, username, type) => {
    const searchUser = await this.findFirst(email);

    if (searchUser)
      return Result.fail({
        statusCode: HttpStatus.OK,
        errorCode: ErrorCode.USER_EXISTED,
        message: 'USER_EXISTED',
      });

    const createUserDto = {
      email: email,
      password: password,
      username: username,
      account_type: type,
    };

    const createdUser = await prisma.users.create({
      data: createUserDto,
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

      return Result.fail({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        // errorCode: ErrorCode.USER_EXISTED,
        message: 'CREATE_USER_FAILED',
      });
    }

    const token = await this.generateToken(createdUser);
    const updatedUser = this.update(createdUser.id, {
      token: token,
    });
    return Result.ok({
      statusCode: HttpStatus.OK,
      data: { ...updatedUser },
    });
  };

  createOA = async (username) => {
    const searchUser = await this.findFirst({ username });

    console.log(searchUser);
    if (searchUser)
      return Result.fail({
        statusCode: HttpStatus.OK,
        errorCode: ErrorCode.USER_EXISTED,
        message: 'OA_EXISTED',
      });

    const createUserDto = {
      username: username,
      account_type: 'oa',
    };

    const createdUser = await prisma.users.create({
      data: createUserDto,
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

      return Result.fail({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        // errorCode: ErrorCode.USER_EXISTED,
        message: 'CREATE_USER_FAILED',
      });
    }

    return Result.ok({
      statusCode: HttpStatus.OK,
      data: { ...createdUser },
    });
  };

  detailOA = async (user_id) => {
    const searchUser = await this.findFirst({ id: user_id });

    if (!searchUser)
      return Result.fail({
        statusCode: HttpStatus.OK,
        errorCode: ErrorCode.USER_NON_EXISTED,
        message: 'OA_NON_EXISTED',
      });

    // TODO: implement Observer to relay user
    // This should have observer pattern so that multiple services can
    // subscribe to it and sync the user
    const userSocial = await socialService.getUserDetail(user_id);

    console.log(userSocial);

    if (!userSocial) {
      console.error('Social user not found');
      return Result.fail({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: ErrorCode.USER_NON_EXISTED,
        message: 'SOCIAL_USER_NON_EXISTED',
      });
    }

    return Result.ok({
      statusCode: HttpStatus.OK,
      data: { ...searchUser, oa: { ...userSocial } },
    });
  };

  updateOA = async (id, user) => {
    const update = await prisma.users.update({
      where: { id },
      data: {
        username: user.name,
      },
    });

    console.log(user);
    const updateUserSocial = await socialService.updateUserDetail(id, user);

    return Result.ok({
      statusCode: HttpStatus.OK,
      data: { ...update, oa: { ...updateUserSocial } },
    });
  };

  deleteOA = async (id) => {
    const deleteUser = await prisma.users.delete({
      where: { id },
    });

    const deleteUserSocial = await socialService.deleteUser(id);

    return Result.ok({
      statusCode: HttpStatus.OK,
      data: { ...deleteUser, oa: { ...deleteUserSocial } },
    });
  };
}

module.exports = UserService;
