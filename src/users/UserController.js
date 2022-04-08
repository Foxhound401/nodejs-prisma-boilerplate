const UserService = require('./UserService');
const UtilsService = require('../utils/UtilsService');
const FileService = require('../file/FileService');
const { sendOtp, verifyOtp } = require('../otp/OTPService');

class UserController {
  constructor() {
    this.userService = new UserService();
    this.utilsService = new UtilsService();
    this.fileService = new FileService();
  }

  signIn = async (req, res) => {
    try {
      const { email_phone, password } = req.body;

      if (!email_phone || !password)
        return res.status(422).json({ error: 'Invalid username or password' });

      if (!this.utilsService.isEmailRegex(email_phone)) {
        const phone_number = email_phone;
        const user = await this.userService.signInWithPhone(
          phone_number,
          password
        );
        return res.status(201).json({ data: user });
      }

      const email = email_phone;
      const user = await this.userService.signInWithEmail(email, password);
      return res.status(201).json({ data: user });
    } catch (error) {
      console.error(error);
      return res.status(500).send({
        success: false,
        message: error.message,
      });
    }
  };

  signUp = async (req, res) => {
    try {
      const { email_phone, password, username } = req.body;

      if (!email_phone)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty for email' });
      if (!password)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty for password' });
      if (!username)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty for username' });

      // Create user with phone_number
      const hashed_password = await this.utilsService.hashingPassword(password);
      const user = {
        email_phone,
        password: hashed_password,
        username,
      };

      console.log("USER_SIGNUP_SOCIAL")
      const createUserResp = await this.userService.signup(user);

      if (!createUserResp)
        return res.status(500).send({
          success: false,
          message: 'Create User failed',
        });

      return res.status(201).send({
        success: true,
        message: 'Success',
        data: createUserResp,
      });
    } catch (error) {
      console.error(error);
      return res.send({
        success: false,
        message: 'Unavailable please try again later',
      });
    }
  };

  getUserInfo = async (req, res) => {
    try {
      const userId = req.jwt_payload?.id;
      const user = await this.userService.findFirst({
        id: userId,
      });

      if (!user) {
        return res.status(404).send({
          success: false,
          message: 'User not found!',
          error: 'Not Found',
        });
      }

      return res.status(200).send({
        data: {
          user: user,
        },
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Unavailable Please Try Again Later' });
    }
  };

  verifyOTP = async (req, res) => {
    try {
      const { id } = req.jwt_payload;
      const otp = req.body.otp;

      const verifyOTPResp = await this.userService.verifyOTP(id, otp);

      if (!verifyOTPResp)
        return res.status(500).send({
          success: false,
          message: 'failed to verify otp',
        });

      console.log('UserController - VerifyOTP: ', verifyOTPResp);

      return res.status(201).send({
        success: true,
        message: 'Success',
        data: { is_verify: true, ...verifyOTPResp },
      });
    } catch (error) {
      console.error(error);
      return res.send({
        success: false,
        message: 'Not available, Please Try again later',
      });
    }
  };

  verifyResetPasswordOTP = async (req, res) => {
    try {
      const { otp, email_phone } = req.body;

      if (!email_phone || !otp)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone' });

      await this.userService.verifyResetPasswordOTP(email_phone, otp);

      return res.status(201).send({
        success: true,
        message: 'success',
        data: {
          is_verify: true,
        },
      });
    } catch (error) {
      console.error(error);
      return res.send({
        success: false,
        message: 'Unavailable please try again later',
      });
    }
  };

  resetPassword = async (req, res) => {
    try {
      const { email_phone, new_password } = req.body;

      if (!email_phone)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone' });
      if (!new_password)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty password' });

      const hashed_password = await this.utilsService.hashingPassword(
        new_password
      );

      const changePasswordResp = await this.userService.resetPassword(
        email_phone,
        hashed_password
      );

      return res.status(201).send({
        success: true,
        message: 'Success',
        data: changePasswordResp,
      });
    } catch (error) {
      console.error(error);
      return res.send({
        success: false,
        message: 'Unavailable please try again later',
      });
    }
  };

  resendResetPasswordOTP = async (req, res) => {
    try {
      const { email_phone } = req.query;

      if (!email_phone)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone' });

      if (!this.utilsService.isEmailRegex(email_phone)) {
        const phone_number = email_phone;

        await this.userService.resendOTPForResetPasswordRequest({
          phone_number,
        });

        return res
          .status(201)
          .json({ data: { message: 'Successfully resend OTP!' } });
      }

      const email = email_phone;
      await this.userService.resendOTPForResetPasswordRequest({
        email,
      });

      return res
        .status(201)
        .json({ data: { message: 'Successfully resend OTP!' } });
    } catch (error) {
      console.error(error);
      return res.send({
        success: false,
        message: 'Unavailable please try again later',
      });
    }
  };

  resendOTP = async (req, res) => {
    try {
      const email = req.jwt_payload?.email;
      const phone_number = req.jwt_payload?.phone_number;

      if (!email && !phone_number)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone' });

      if (phone_number) {
        const user = await this.userService.findFirst({ phone_number });
        if (!user) return res.status(404).json({ error: 'User Not Found!' });
        await sendOtp(phone_number);
        await this.userService.update(user.id, {
          is_verify: false,
          otp_code: '',
        });

        return res
          .status(201)
          .json({ data: { message: 'Successfully resend OTP!' } });
      }

      await this.userService.sendOTPEmail(email);
      return res
        .status(201)
        .json({ data: { message: 'Successfully resend OTP!' } });
    } catch (error) {
      throw error;
    }
  };

  sendForgetPasswordResetCode = async (req, res) => {
    try {
      const { email } = req.query;
      await this.userService
        .sendForgetPasswordResetCode(email)
        .catch((error) => {
          return res.status(500).json({ error });
        });

      return res.status(200).json({
        message: 'Reset code sent!!!',
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  sendResetPasswordOTP = async (req, res) => {
    try {
      const { email_phone } = req.body;
      console.log(email_phone);

      if (!email_phone)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty for email' });

      if (!this.utilsService.isEmailRegex(email_phone)) {
        const phone_number = email_phone;

        await this.userService.sendOTPToVerifyResetPasswordRequest({
          phone_number,
        });

        return res.status(201).json({
          data: { message: 'OTP send successfully!!', otpSent: true },
        });
      }

      const email = email_phone;
      await this.userService.sendOTPToVerifyResetPasswordRequest({ email });

      return res
        .status(201)
        .json({ data: { message: 'OTP send successfully', otpSent: true } });
    } catch (error) {
      console.error(error);
      return res.status(500).send({
        success: false,
        message: 'Send Otp failed',
      });
    }
  };

  getCurrentUser = async (req, res) => {
    try {
      const { id } = req.jwt_payload;
      const user = await this.userService.getCurrentUser(id);
      return res.status(200).json({
        user,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  updateUserAvatar = async (req, res) => {
    try {
      const { id } = req.params;
      const file = {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        buffer: req.file.buffer,
        size: req.file.size,
      };

      if (!id)
        return res.status(500).send({
          message: 'id is missing',
        });

      const fileResp = await this.fileService.uploadUserAvatar(id, file);
      if (!fileResp)
        return res.status(500).send({
          message: 'failed to upload avatar',
        });
      return res.send({
        success: true,
        message: 'Success',
        data: fileResp,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({
        success: false,
        message: 'Server Error',
      });
    }
  };

  updateUserCover = async (req, res) => {
    try {
      const { id } = req.params;
      const file = {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        buffer: req.file.buffer,
        size: req.file.size,
      };

      if (!id)
        return res.status(500).send({
          message: 'id is missing',
        });

      const fileResp = await this.fileService.uploadUserCover(id, file);
      if (!fileResp)
        return res.status(500).send({
          message: 'failed to upload cover',
        });
      return res.send({
        success: true,
        message: 'Success',
        data: fileResp,
      });
    } catch (error) {
      return res.status(500).send({
        success: false,
        message: 'Server Error',
      });
    }
  };

  updateUserProfile = async (req, res) => {
    try {
      const id = req.jwt_payload?.id;
      const { user } = req.body;
      const updateUser = await this.userService.update(id, user);
      return res.send({
        success: true,
        message: 'Success',
        data: updateUser,
      });
    } catch (error) {
      console.error(error);
      return res.send({
        success: false,
        message: 'Not available, Please Try again later',
      });
    }
  };

  deleteUser = async (req, res) => {
    try {
      const id = req.jwt_payload?.id;
      const deleteUserResp = await this.userService.delete(id);
      return res.send({
        success: true,
        message: 'Success',
        data: deleteUserResp,
      });
    } catch (error) {
      console.error(error);
      return res.send({
        success: false,
        message: 'Not available, Please Try again later',
      });
    }
  };

  search = async (req, res) => {
    try {
      const { id } = req.jwt_payload;
      const { search_input } = req.params;
      const parsed_search_input = search_input.toLowerCase();
      const searchResp = await this.userService.search(id, parsed_search_input);

      return res.status(201).send({
        success: true,
        message: 'Success',
        data: searchResp,
      });
    } catch (error) {
      console.error(error);
      return res.send({
        success: false,
        message: 'Not available, Please Try again later',
      });
    }
  };
}

module.exports = UserController;
