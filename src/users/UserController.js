const UserService = require('./UserService');
const UtilsService = require('../utils/UtilsService');
const { sendOtp, verifyOtp } = require('../otp/OTPService');
const { prisma } = require('@prisma/client');

class UserController {
  constructor() {
    this.userService = new UserService();
    this.utilsService = new UtilsService();
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
        message: 'Unavailable, please try again later',
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
      if (!this.utilsService.isEmailRegex(email_phone)) {
        const phone_number = email_phone;

        const user = {
          phone_number,
          username,
          password: await this.utilsService.hashingPassword(password),
        };

        const createdUser = await this.userService.signup(user);

        return res.status(201).send({
          success: true,
          message: 'Success',
          data: createdUser,
        });
      }

      // Create user with email
      const email = email_phone;
      const user = {
        email,
        username,
        password: await this.utilsService.hashingPassword(password),
      };
      const createdUser = await this.userService.signup(user);

      return res.status(201).send({
        success: true,
        message: 'Success',
        data: createdUser,
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
      const email = req.user?.email;
      const phone_number = req.user?.phone_number;

      console.log(email);
      console.log(phone_number);

      if (!email && !phone_number)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone_number' });

      // Create user with phone_number
      if (phone_number) {
        const user = await this.userService.firstRow({
          phone_number,
        });

        if (!user)
          return res
            .status(404)
            .json({ message: 'User not found!', error: 'Not Found' });

        return res.status(201).json({
          data: {
            user: user,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
          },
        });
      }

      // Create user with email
      const user = await this.userService.firstRow({ email });
      console.log('USER_CONTROLLER: ', user);

      if (!user) {
        return res
          .status(404)
          .json({ message: 'User not found!', error: 'Not Found' });
      }

      return res.status(200).json({
        data: {
          user: user,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  };

  updateUserProfile = async () => {
    try {
      const id = req.user?.id;
      const { user } = req.body;
      const updateUser = this.userService.update(id, user);
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

  verifyOTP = async (req, res) => {
    try {
      const email = req.user?.email;
      const phone_number = req.user?.phone_number;
      const otp = req.body.otp;

      if (!email && !phone_number)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone' });

      if (phone_number) {
        if (!user) return res.status(404).json({ error: 'User Not Found!' });
        const verifiedOTP = await verifyOtp(phone_number, otp);
        if (verifiedOTP !== 'approved' && verifiedOTP.valid) {
          user.otp_code = otp;
          user.is_verify = true;
          user.save();
        }
        return res.status(201).json({ data: { is_verify: user.is_verify } });
      }

      const verifiedOTP = await this.userService.verifyOTPEmail(email, otp);
      if (!verifiedOTP)
        return res
          .status(400)
          .json({ error: 'Failed to verify OTP via Email' });
      return res
        .status(201)
        .json({ data: { is_verify: verifiedOTP.is_verify } });
    } catch (error) {
      throw error;
    }
  };

  verifyResetPasswordOTP = async (req, res) => {
    try {
      const { otp, email_phone } = req.body;

      console.log(otp);
      console.log(email_phone);
      if (!email_phone || !otp)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone' });

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: 'User Not Found!' });
        const verifiedOTP = await verifyOtp(phone_number, otp);
        if (verifiedOTP !== 'approved' && verifiedOTP.valid) {
          user.otp_code = otp;
          user.is_verify = true;
          user.save();
        }
        return res.status(201).json({ data: { is_verify: user.is_verify } });
      }

      const email = email_phone;
      const verifiedOTP = await this.userService.verifyOTPEmail(email, otp);
      if (!verifiedOTP)
        return res
          .status(400)
          .json({ error: 'Failed to verify OTP via Email' });
      return res
        .status(201)
        .json({ data: { is_verify: verifiedOTP.is_verify } });
    } catch (error) {
      throw error;
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

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      const hashedPassword = await this.utilsService.hashingPassword(
        new_password
      );
      console.log(hashedPassword);

      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: 'User Not Found!' });

        user.password = hashedPassword;
        await user.save();

        return res
          .status(201)
          .json({ data: { message: 'Successfully reset password!!', user } });
      }

      const email = email_phone;
      const user = await this.userService.firstRow({ email });
      if (!user) return res.status(404).json({ error: 'User Not Found!' });

      user.password = hashedPassword;
      await user.save();

      return res
        .status(201)
        .json({ data: { message: 'Successfully reset password!!', user } });
    } catch (error) {
      throw error;
    }
  };

  resendResetPasswordOTP = async (req, res) => {
    try {
      const email_phone = req.query.email_phone;

      if (!email_phone)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone' });

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: 'User Not Found!' });
        await sendOtp(phone_number);
        user.is_verify = false;
        user.otp_code = '';
        user.save();

        return res
          .status(201)
          .json({ data: { message: 'Successfully resend OTP!' } });
      }

      const email = email_phone;

      await this.userService.sendOTPEmail(email);
      return res
        .status(201)
        .json({ data: { message: 'Successfully resend OTP!' } });
    } catch (error) {
      throw error;
    }
  };

  resendOTP = async (req, res) => {
    try {
      const email = req.user?.email;
      const phone_number = req.user?.phone_number;

      if (!email && !phone_number)
        return res
          .status(422)
          .json({ error: 'Wrong format or empty email/phone' });

      if (phone_number) {
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: 'User Not Found!' });
        await sendOtp(phone_number);
        user.is_verify = false;
        user.otp_code = '';
        user.save();

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

  // filterUser = async (req, res) => {
  //   try {
  //     const { email } = req.query;
  //
  //     console.log(email);
  //     const users = await this.userService.getUsersByFilters(email);
  //     console.log(users);
  //
  //     return res.status(200).json({
  //       users,
  //     });
  //   } catch (error) {
  //     return res.status(400).json({ error: error.message });
  //   }
  // };

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

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      // Create user with phone_number
      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;

        const user = await this.userService.firstRow({
          phone_number,
        });

        if (!user)
          return res.status(404).json({
            data: { error: 'User Not Found!!' },
          });

        // SEND OTP VIA TWILIO
        await sendOtp(phone_number);

        return res.status(201).json({
          data: { message: 'OTP send successfully!!', otpSent: true },
        });
      }

      // Create user with email
      const email = email_phone;
      console.log(email);
      const user = await this.userService.firstRow({ email });

      if (!user)
        return res.status(404).json({
          data: { error: 'User Not Found' },
        });

      // SEND OTP VIA EMAIL
      await this.userService.sendOTPEmail(email);

      return res
        .status(201)
        .json({ data: { message: 'OTP send successfully', otpSent: true } });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  getCurrentUser = async (req, res) => {
    try {
      const { id } = req.user;
      const user = await this.userService.getCurrentUser(id);
      return res.status(200).json({
        user,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };
}

module.exports = UserController;
