const { CRUDService } = require("./crud");
const UtilsService = require("./utils");
const jwt = require('jsonwebtoken');
const twilioService = require("./twilio-service");
const models = require("../database/models")
const { Op } = require("sequelize");
const mailService = require("./mails")

const MAX_OTP_CHARACTERS = 4;


class UserService extends CRUDService {
    constructor(model) {
        super(model)
        this.utilsService = new UtilsService;
        this.usersAccountService = new CRUDService(models.UsersAccount);
    }

    generateOTP = (max = MAX_OTP_CHARACTERS) => {
        return this.utilsService.getRandomString(max)
    }

    getNewToken = async (existedUser) => {
        let user = {
            id: existedUser.id,
            email: existedUser.email,
            password: await this.utilsService.hashingPassword((new Date()).toString()),
            createdAt: existedUser.createdAt,
            updatedAt: existedUser.updatedAt
        }
        return jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
            expiresIn: "24h"
        });
    }

    signIn = async (userPayload) => {
        const { email, otp, ua_source } = userPayload;
        const existedUser = await this.firstRow({ email: email })
        if (existedUser) {
            const isOTPCorrect = (otp === existedUser.otp_code)
            if (!isOTPCorrect) {
                throw new Error('OTP is not correct')
            }
            if (!existedUser.is_verify) {
                throw new Error('Your account is not activated yet')
            }
            const newToken = await this.getNewToken(existedUser)
            // console.log("signIn new set: ua_source")
            // existedUser.ua_source = ua_source
            existedUser.token = newToken
            existedUser.otp_code = null;
            existedUser.is_verify = true;
            await existedUser.save()
            return {
                user: {
                    email: existedUser.email
                },
                token: newToken,
            }
        }
    }

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
            return res.status(404).send("user with the specified ID does not exists");
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
            throw new Error("User not found");
        } catch (error) {
            return res.status(500).send(error.message);
        }
    };

    deleteUser = async (req, res) => {
        try {
            const { userId } = req.params;
            const deleted = await this.delete({ id: userId });
            if (deleted) {
                return res.status(204).send("User deleted");
            }
            throw new Error("User not found");
        } catch (error) {
            return res.status(500).send(error.message);
        }
    };

    sendForgetPasswordLink = async (email) => {
        const user = await this.firstRow({ email: email });
        if (!user) return { error: "Email or username not found!" }

        let r = Math.random().toString(36).substring(7);
        user.reset_token = r;
        await user.save();
        const confirm_url = "https" + process.env.DOMAIN + '/sso/users/reset-password-email?email=' + user.email + '&reset_token=' + r
        try {
            const data = mailService.sendForgotMail(user.email, confirm_url)
            return data
        } catch (error) {
            throw error
        }
    }

    sendForgetPasswordResetCode = async (email) => {
        const user = await this.firstRow({ email: email });
        if (!user) return { error: "Email or username not found!" }

        const reset_code = Math.floor(100000 + Math.random() * 900000)
        user.reset_token = reset_code;

        try {
            const saveUser = await user.save();
            if (!saveUser) return { error: "Failed to generate Reset Code" }

            await mailService.sendForgotResetCode(user.email, reset_code)
        } catch (error) {
            throw error
        }
    }

    resetPasswordEmail = async (email, reset_token, new_password) => {
        const user = await this.firstRow({ email: email });
        if (user && user.reset_token === reset_token) {
            const hashedPassword = await this.utilsService.hashingPassword(new_password)
            user.password = hashedPassword
            await user.save();
            return { 'success': 1 };
        } else {
            return { 'success': 0 };
        }
    }

    getUserListByConditions = async (conditions) => {
        try {
            const users = await this.list(conditions);
            return users
        } catch (error) {
            return []
        }
    }

    signupWithSms = async (email, otp, phoneNumber) => {
        try {
            const verifyOtp = await twilioService.verifyOtp(phoneNumber, otp);

            if (verifyOtp.status === "approved" && verifyOtp.valid) {
                const user = await this.firstRow({ email });

                if (user) {
                    if (!phoneNumber && !otp) {
                        return { error: "account already registed with different method" }
                    }

                    const newToken = jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
                        expiresIn: "7d"
                    });

                    user.token = newToken;
                    user.save();
                    console.log("EMAIL IN IF: ", email)

                    const { token, is_admin } = user;

                    console.log("EMAIL IN IF: ", email)

                    const result = {
                        email,
                        token,
                        is_admin,
                        avatar: "",
                        name: "",
                        firstname: "",
                        lastname: "",
                        account_type: "twilio"
                    }

                    return result;
                } else {
                    const createUser = await this.create({
                        email
                    });

                    const newToken = jwt.sign({ user: createUser }, process.env.JWT_SECRET_KEY, {
                        expiresIn: "7d"
                    });

                    createUser.token = newToken;
                    createUser.save();

                    const usersAccount = await this.usersAccountService.create({
                        account_type: "twilio",
                        phone_number: phoneNumber,
                        user_id: createUser.id
                    });

                    const { token } = createUser;
                    const { account_type } = usersAccount;
                    if (createUser && usersAccount) {
                        const result = {
                            email,
                            avatar: "",
                            name: "",
                            firstname: "",
                            lastname: "",
                            account_type,
                            token

                        }
                        return result;
                    } else {
                        return { error: "signup failed due to server error!" };
                    }
                }
            } else {
                return { error: "failed to verify otp" }
            }

        } catch (error) {
            return {
                error: error.message,
                message: "signupWithSms | userService"
            };
        }
    }

    getUsersByFilters = async (email) => {
        // TODO: select user base on name, select users base on name and email
        // const users = await this.list({ name: filters.name, email: filters.email, phone_number: filters.phoneNumber })
        const users = await models.User.findAll({
            where: {
                email: email,
            },
        })

        return users
    }
}




module.exports = UserService
