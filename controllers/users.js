const UserService = require("../services/users");
const UtilsService = require("../services/utils");
const { CRUDService } = require("../services/crud");
const googleService = require("../services/google-service");
const facebookService = require("../services/facebook-service");
const githubService = require("../services/github-service");
const models = require("../database/models");
const { Op } = require("sequelize");
const mailService = require("../services/mails");
const jwt = require("jsonwebtoken");
const { sendOtp, verifyOtp } = require("../services/twilio-service");

class UserController {
  constructor() {
    this.userService = new UserService(models.User);
    this.utilsService = new UtilsService();
    this.usersAccountService = new CRUDService(models.UsersAccount);
  }

  sendOTP = async (req, res) => {
    try {
      const { email } = req.body;
      const user = await this.userService.firstRow({ email: email });
      const otp = this.userService.generateOTP();
      if (user) {
        this.userService.update({ id: user.id }, { otp_code: otp });
        // TODO: Send email to user here
        mailService.sendOTP(email, otp);
        return res.status(201).json({
          data: "OTP is generated",
        });
      } else {
        // TODO: Send email to user here
        mailService.sendOTP(email, otp);
        await this.userService.create({
          email: email,
          otp_code: otp,
          password: await this.utilsService.hashingPassword(
            new Date().toString()
          ),
        });
        return res.status(201).json({
          data: otp,
        });
      }
      return res.status(400).json({ error: "User not found" });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  signUpWithSMS = async (req, res) => {
    try {
      const { email, otp, phoneNumber } = req.body;

      const data = await this.userService.signupWithSms(
        email,
        otp,
        phoneNumber
      );

      return res.status(201).json({ data });
    } catch (error) {
      return res.status(409).json({
        error: error.message,
      });
    }
  };

  signUpWithGithub = async (req, res) => {
    try {
      const { code } = req.query;

      const githubUser = await githubService.getProfile(code);

      console.log(githubUser);

      // FIXME: udpate error message later
      if (!githubService)
        return res.status(422).json({ error: "Error in Github signin!" });

      const user = await this.userService.firstRow({ email: githubUser.email });

      // FIXME: All this logic should be in services
      if (user) {
        const usersAccount = await models.UsersAccount.findAll({
          where: { user_id: { [Op.eq]: user.id } },
        });
        if (usersAccount.account_type === "github") {
          const newToken = jwt.sign(
            { user: user },
            process.env.JWT_SECRET_KEY,
            {
              expiresIn: "7d",
            }
          );

          user.token = newToken;
          user.save();

          const { email, token, is_admin } = user;
          const { avatar_url: avatar, name } = githubUser;
          const result = {
            email,
            token: "test_token",
            is_admin,
            avatar,
            name,
            firstname: name,
            lastname: name,
            account_type: "github",
          };

          this.utilsService.sendEventWithPusher(result);
          return res.status(201).json({ data: result });
        } else {
          return res
            .status(409)
            .json({ error: "User already registered with another method!" });
        }
      } else {
        // FIXME: create user and usersaccount should be a transaction
        const createUser = await this.userService.create({
          email: githubUser.email,
        });

        const newToken = jwt.sign(
          { user: createUser },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: "7d",
          }
        );

        createUser.token = newToken;
        createUser.save();

        const usersAccount = await this.usersAccountService.create({
          account_type: "github",
          authentication: githubUser.id,
          avatar: githubUser.avatar_url,
          name: githubUser.name,
          firstname: githubUser.name,
          lastname: githubUser.name,
          access_token: githubUser.access_token,
          user_id: createUser.id,
        });

        const { email, token } = createUser;
        const {
          avatar,
          name,
          firstname,
          lastname,
          account_type,
        } = usersAccount;
        if (createUser && usersAccount) {
          const result = {
            email,
            avatar,
            name,
            firstname,
            lastname,
            account_type,
            token: "test_token",
          };

          this.utilsService.sendEventWithPusher(result);
          return res.status(201).json({
            data: result,
          });
        } else {
          return res
            .status(500)
            .json({ error: "signup failed due to server error!" });
        }
      }
    } catch (error) {
      return res.status(409).json({
        error: error.message,
      });
    }
  };

  signUpWithFacebook = async (req, res) => {
    try {
      const { code } = req.query;

      const facebookUser = await facebookService.getProfile(code);

      // FIXME: udpate error message later
      if (!facebookUser)
        return res.status(422).json({ error: "Error in Facebook signin!" });

      const user = await this.userService.firstRow({
        email: facebookUser.email,
      });

      // FIXME: All this logic should be in services
      if (user) {
        const newToken = jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
          expiresIn: "7d",
        });

        user.token = newToken;
        user.save();

        const { email, token, is_admin } = user;
        const {
          picture: {
            data: { url: avatar },
          },
          name,
          first_name: firstname,
          last_name: lastname,
        } = facebookUser;
        const result = {
          email,
          token: "test_token",
          is_admin,
          avatar,
          name,
          firstname,
          lastname,
          account_type: "facebook",
        };

        this.utilsService.sendEventWithPusher(result);
        return res.status(201).json({ data: result });
      } else {
        // FIXME: create user and usersaccount should be a transaction
        const createUser = await this.userService.create({
          email: facebookUser.email,
        });

        const newToken = jwt.sign(
          { user: createUser },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: "7d",
          }
        );

        createUser.token = newToken;
        createUser.save();

        const usersAccount = await this.usersAccountService.create({
          account_type: "facebook",
          authentication: facebookUser.id,
          avatar: facebookUser.picture.data.url,
          name: facebookUser.name,
          firstname: facebookUser.first_name,
          lastname: facebookUser.last_name,
          access_token: facebookUser.access_token,
          user_id: createUser.id,
        });

        const { email, token } = createUser;
        const {
          avatar,
          name,
          firstname,
          lastname,
          account_type,
        } = usersAccount;
        if (createUser && usersAccount) {
          const result = {
            email,
            avatar,
            name,
            firstname,
            lastname,
            account_type,
            token: "test_token",
          };
          this.utilsService.sendEventWithPusher(result);
          return res.status(201).json({
            data: result,
          });
        } else {
          return res
            .status(500)
            .json({ error: "signup failed due to server error!" });
        }
      }
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  signUpWithGoogle = async (req, res) => {
    try {
      const { code } = req.query;
      // get user info
      const googleUser = await googleService.getProfile(code);

      // FIXME: udpate error message later
      if (!googleUser)
        return res.status(422).json({ error: "Error in google signin!" });

      const user = await this.userService.firstRow({ email: googleUser.email });

      // FIXME: All this logic should be in services
      if (user) {
        const newToken = jwt.sign(
          {
            email: user.email,
          },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: "7d",
          }
        );

        user.token = newToken;
        user.save();

        const { email, token, is_admin } = user;
        const {
          picture: avatar,
          name,
          given_name: firstname,
          family_name: lastname,
        } = googleUser;
        const result = {
          email,
          token: "test_token",
          is_admin,
          avatar,
          name,
          firstname,
          lastname,
          account_type: "google",
        };

        this.utilsService.sendEventWithPusher(result);
        return res.status(201).json({ data: result });
      } else {
        // FIXME: create user and usersaccount should be a transaction
        const createUser = await this.userService.create({
          email: googleUser.email,
        });

        const newToken = jwt.sign(
          { user: createUser },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: "7d",
          }
        );

        createUser.token = newToken;
        createUser.save();

        const usersAccount = await this.usersAccountService.create({
          account_type: "google",
          authentication: googleUser.id,
          avatar: googleUser.picture,
          name: googleUser.name,
          firstname: googleUser.given_name,
          lastname: googleUser.family_name,
          access_token: googleUser.access_token,
          user_id: createUser.id,
        });

        const { email, token } = createUser;
        const {
          avatar,
          name,
          firstname,
          lastname,
          account_type,
        } = usersAccount;
        if (createUser && usersAccount) {
          const result = {
            email,
            avatar,
            name,
            firstname,
            lastname,
            account_type,
            token: "test_token",
          };

          this.utilsService.sendEventWithPusher(result);
          return res.status(201).json({
            data: result,
          });
        } else {
          return res
            .status(500)
            .json({ error: "signup failed due to server error!" });
        }
      }
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  signIn = async (req, res) => {
    try {
      const { email_phone, password } = req.body;

      if (!email_phone || !password)
        return res.status(422).json({ error: "Invalid username or password" });

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;
        // check for phone
        const user = await this.userService.firstRow({
          phone_number,
        });

        // if phone do

        if (!user)
          return res.status(400).json({ error: "Phone number not found!" });

        const validPassword = await this.utilsService.comparePassword(
          password,
          user.password
        );

        if (!validPassword)
          return res.status(400).json({ error: "Wrong username or password" });

        user.token = "";
        const newToken = jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
          expiresIn: "7d",
        });
        user.token = newToken;
        user.save();

        return res.status(201).json({ data: user });
      }

      const email = email_phone;

      const user = await this.userService.firstRow({ email });
      if (!user)
        return res.status(400).json({ error: "Email or username not found!" });

      const validPassword = await this.utilsService.comparePassword(
        password,
        user.password
      );

      if (!validPassword)
        return res.status(400).json({ error: "Wrong username or password" });

      user.token = "";
      const newToken = jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
        expiresIn: "7d",
      });
      user.token = newToken;
      user.save();

      return res.status(201).json({ data: user });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  };

  signUp = async (req, res) => {
    try {
      const { email_phone, password, username } = req.body;

      if (!email_phone)
        return res
          .status(422)
          .json({ error: "Wrong format or empty for email" });
      if (!password)
        return res
          .status(422)
          .json({ error: "Wrong format or empty for password" });
      if (!username)
        return res
          .status(422)
          .json({ error: "Wrong format or empty for username" });

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      // Create user with phone_number
      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;

        const user = await this.userService.firstRow({
          phone_number,
        });

        if (!user) {
          const createUser = await this.userService.create({
            phone_number: phone_number,
            username: username,
            password: await this.utilsService.hashingPassword(password),
          });

          const newToken = jwt.sign(
            { user: createUser },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "7d" }
          );

          createUser.token = newToken;
          createUser.save();

          // SEND OTP VIA TWILIO
          await sendOtp(phone_number);

          return res.status(201).json({
            data: createUser,
          });
        }

        return res.status(409).json({ error: "Phone number already existed!" });
      }

      // Create user with email
      const email = email_phone;
      const user = await this.userService.firstRow({ email });

      if (!user) {
        const createUser = await this.userService.create({
          email,
          username,
          password: await this.utilsService.hashingPassword(password),
        });

        const newToken = jwt.sign(
          { user: createUser },
          process.env.JWT_SECRET_KEY,
          { expiresIn: "7d" }
        );

        createUser.token = newToken;
        createUser.save();

        // SEND OTP VIA EMAIL
        await this.userService.sendOTPEmail(email);

        return res.status(201).json({
          data: createUser,
        });
      }

      return res.status(409).json({ error: "Email already existed!" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
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
          .json({ error: "Wrong format or empty email/phone_number" });

      // Create user with phone_number
      if (phone_number) {
        const user = await this.userService.firstRow({
          phone_number,
        });

        if (!user)
          return res
            .status(404)
            .json({ message: "User not found!", error: "Not Found" });

        return res.status(201).json({
          data: {
            ...user,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
          },
        });
      }

      // Create user with email
      const user = await this.userService.firstRow({ email });

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found!", error: "Not Found" });
      }

      return res.status(200).json({
        data: {
          ...user,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
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
          .json({ error: "Wrong format or empty email/phone" });

      if (phone_number) {
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: "User Not Found!" });
        const verifiedOTP = await verifyOtp(phone_number, otp);
        if (verifiedOTP !== "approved" && verifiedOTP.valid) {
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
          .json({ error: "Failed to verify OTP via Email" });
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
          .json({ error: "Wrong format or empty email/phone" });

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: "User Not Found!" });
        const verifiedOTP = await verifyOtp(phone_number, otp);
        if (verifiedOTP !== "approved" && verifiedOTP.valid) {
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
          .json({ error: "Failed to verify OTP via Email" });
      return res
        .status(201)
        .json({ data: { is_verify: verifiedOTP.is_verify } });
    } catch (error) {
      throw error;
    }
  };

  resetPasswordOTP = async (req, res) => {
    try {
      const { email_phone, new_password } = req.body;

      if (!email_phone)
        return res
          .status(422)
          .json({ error: "Wrong format or empty email/phone" });
      if (!new_password)
        return res
          .status(422)
          .json({ error: "Wrong format or empty password" });

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      const hashedPassword = await this.utilsService.hashingPassword(
        new_password
      );
      console.log(hashedPassword);

      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: "User Not Found!" });

        user.password = hashedPassword;
        await user.save();

        return res
          .status(201)
          .json({ data: { message: "Successfully reset password!!", user } });
      }

      const email = email_phone;
      const user = await this.userService.firstRow({ email });
      if (!user) return res.status(404).json({ error: "User Not Found!" });

      user.password = hashedPassword;
      await user.save();

      return res
        .status(201)
        .json({ data: { message: "Successfully reset password!!", user } });
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
          .json({ error: "Wrong format or empty email/phone" });

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: "User Not Found!" });
        await sendOtp(phone_number);
        user.is_verify = false;
        user.otp_code = "";
        user.save();

        return res
          .status(201)
          .json({ data: { message: "Successfully resend OTP!" } });
      }

      const email = email_phone;

      await this.userService.sendOTPEmail(email);
      return res
        .status(201)
        .json({ data: { message: "Successfully resend OTP!" } });
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
          .json({ error: "Wrong format or empty email/phone" });

      if (phone_number) {
        const user = await this.userService.firstRow({ phone_number });
        if (!user) return res.status(404).json({ error: "User Not Found!" });
        await sendOtp(phone_number);
        user.is_verify = false;
        user.otp_code = "";
        user.save();

        return res
          .status(201)
          .json({ data: { message: "Successfully resend OTP!" } });
      }

      await this.userService.sendOTPEmail(email);
      return res
        .status(201)
        .json({ data: { message: "Successfully resend OTP!" } });
    } catch (error) {
      throw error;
    }
  };

  filterUser = async (req, res) => {
    try {
      const { email } = req.query;

      console.log(email);
      const users = await this.userService.getUsersByFilters(email);
      console.log(users);

      return res.status(200).json({
        users,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  signInWithOTP = async (req, res) => {
    try {
      const { email, otp } = req.body;
      const userPayload = {
        email,
        otp,
      };
      const userSignIn = await this.userService.signIn(userPayload);

      return res.status(200).json({
        data: userSignIn,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  sendForgetPasswordLinkToEmail = async (req, res) => {
    try {
      const { email } = req.body;
      const userForgetPassword = await this.userService.sendForgetPasswordLink(
        email
      );

      return res.status(200).json({
        data: userForgetPassword,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
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
        message: "Reset code sent!!!",
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
          .json({ error: "Wrong format or empty for email" });

      const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      // Create user with phone_number
      if (!mailRegex.test(email_phone)) {
        const phone_number = email_phone;

        const user = await this.userService.firstRow({
          phone_number,
        });

        if (!user)
          return res.status(404).json({
            data: { error: "User Not Found!!" },
          });

        // SEND OTP VIA TWILIO
        await sendOtp(phone_number);

        return res.status(201).json({
          data: { message: "OTP send successfully!!", otpSent: true },
        });
      }

      // Create user with email
      const email = email_phone;
      console.log(email);
      const user = await this.userService.firstRow({ email });

      if (!user)
        return res.status(404).json({
          data: { error: "User Not Found" },
        });

      // SEND OTP VIA EMAIL
      await this.userService.sendOTPEmail(email);

      return res
        .status(201)
        .json({ data: { message: "OTP send successfully", otpSent: true } });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  resetPassword = async (req, res) => {
    try {
      const { email, reset_code } = req.query;
      const { new_password } = req.body;
      const userResetPassword = await this.userService.resetPasswordEmail(
        email,
        reset_code,
        new_password
      );
      return res.status(200).json({
        ...userResetPassword,
      });
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
