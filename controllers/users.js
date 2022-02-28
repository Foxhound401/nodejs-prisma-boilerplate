const UserService = require("../services/users");
const UtilsService = require("../services/utils");
const { CRUDService } = require("../services/crud");
const googleService = require("../services/google-service");
const facebookService = require("../services/facebook-service");
const githubService = require("../services/github-service");
const models = require("../database/models");
const { Op } = require("sequelize");
const mailService = require("../services/mails");
const jwt = require('jsonwebtoken');

class UserController {
    constructor() {
        this.userService = new UserService(models.User);
        this.utilsService = new UtilsService;
        this.usersAccountService = new CRUDService(models.UsersAccount);
    }

    sendOTP = async (req, res) => {
        try {
            const { email } = req.body
            const user = await this.userService.firstRow({ email: email })
            const otp = this.userService.generateOTP()
            if (user) {
                this.userService.update({ id: user.id }, { otp_code: otp })
                // TODO: Send email to user here
                mailService.sendOTP(email, otp)
                return res.status(201).json({
                    data: "OTP is generated"
                })
            } else {
                // TODO: Send email to user here
                mailService.sendOTP(email, otp)
                await this.userService.create({
                    email: email,
                    otp_code: otp,
                    password: await this.utilsService.hashingPassword((new Date()).toString())
                })
                return res.status(201).json({
                    data: otp
                })
            }
            return res.status(400).json({ error: 'User not found' })
        } catch (error) {
            return res.status(400).json({ error: error.message })
        }
    }

    signUpWithEmailPassword = async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email) return res.status(422).json({ error: "Wrong format for email" });
            if (!password) return res.status(422).json({ error: "Wrong format for password" });

            // multiple signup purpose
            const user = await this.userService.firstRow({ email: email })

            if (user) {
                return res.status(409).json({ error: "Email already existed!" })
            } else {
                const createUser = await this.userService.create({
                    email: email,
                    password: await this.utilsService.hashingPassword(password)
                });

                return res.status(201).json({
                    data: createUser
                });
            }

        } catch (error) {
            return res.status(400).json({ error: error.message })
        }
    }

    signUpWithSMS = async (req, res) => {
        try {
            const { email, otp, phoneNumber } = req.body;

            const data = await this.userService.signupWithSms(email, otp, phoneNumber);

            return res.status(201).json({ data });

        } catch (error) {
            return res.status(409).json({
                error: error.message,
            });
        }

    }

    signUpWithGithub = async (req, res) => {
        try {
            const { code } = req.query;

            const githubUser = await githubService.getProfile(code);

            console.log(githubUser)

            // FIXME: udpate error message later
            if (!githubService) return res.status(422).json({ error: "Error in Github signin!" })

            const user = await this.userService.firstRow({ email: githubUser.email })

            // FIXME: All this logic should be in services
            if (user) {
                const usersAccount = await models.UsersAccount.findAll({ where: { user_id: { [Op.eq]: user.id } } })
                if (usersAccount.account_type === "github") {

                    const newToken = jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
                        expiresIn: "7d"
                    });

                    user.token = newToken;
                    user.save();

                    const { email, token, is_admin } = user;
                    const {
                        avatar_url: avatar,
                        name
                    } = githubUser;
                    const result = {
                        email,
                        token: "test_token",
                        is_admin,
                        avatar,
                        name,
                        firstname: name,
                        lastname: name,
                        account_type: "github"
                    }

                    this.utilsService.sendEventWithPusher(result);
                    return res.status(201).json({ data: result })
                } else {
                    return res.status(409).json({ error: "User already registered with another method!" })
                }
            } else {
                // FIXME: create user and usersaccount should be a transaction
                const createUser = await this.userService.create({
                    email: githubUser.email
                });

                const newToken = jwt.sign({ user: createUser }, process.env.JWT_SECRET_KEY, {
                    expiresIn: "7d"
                });

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
                    user_id: createUser.id
                });

                const { email, token } = createUser;
                const { avatar, name, firstname, lastname, account_type } = usersAccount;
                if (createUser && usersAccount) {
                    const result = {
                        email,
                        avatar,
                        name,
                        firstname,
                        lastname,
                        account_type,
                        token: "test_token"

                    }

                    this.utilsService.sendEventWithPusher(result);
                    return res.status(201).json({
                        data: result
                    });
                } else {
                    return res.status(500).json({ error: "signup failed due to server error!" })
                }
            }
        } catch (error) {
            return res.status(409).json({
                error: error.message,
            });
        }

    }

    signUpWithFacebook = async (req, res) => {
        try {
            const { code } = req.query;

            const facebookUser = await facebookService.getProfile(code);

            // FIXME: udpate error message later
            if (!facebookUser) return res.status(422).json({ error: "Error in Facebook signin!" })

            const user = await this.userService.firstRow({ email: facebookUser.email })

            // FIXME: All this logic should be in services
            if (user) {
                const newToken = jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
                    expiresIn: "7d"
                });

                user.token = newToken;
                user.save();

                const { email, token, is_admin } = user;
                const {
                    picture: { data: { url: avatar } },
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
                    account_type: "facebook"
                }

                this.utilsService.sendEventWithPusher(result);
                return res.status(201).json({ data: result })
            } else {
                // FIXME: create user and usersaccount should be a transaction
                const createUser = await this.userService.create({
                    email: facebookUser.email
                });

                const newToken = jwt.sign({ user: createUser }, process.env.JWT_SECRET_KEY, {
                    expiresIn: "7d"
                });

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
                    user_id: createUser.id
                });

                const { email, token } = createUser;
                const { avatar, name, firstname, lastname, account_type } = usersAccount;
                if (createUser && usersAccount) {
                    const result = {
                        email,
                        avatar,
                        name,
                        firstname,
                        lastname,
                        account_type,
                        token: "test_token"

                    }
                    this.utilsService.sendEventWithPusher(result);
                    return res.status(201).json({
                        data: result
                    });
                } else {
                    return res.status(500).json({ error: "signup failed due to server error!" })
                }
            }
        } catch (error) {
            return res.status(400).json({ error: error.message })
        }

    }

    signUpWithGoogle = async (req, res) => {
        try {
            const { code } = req.query;
            // get user info
            const googleUser = await googleService.getProfile(code);

            // FIXME: udpate error message later
            if (!googleUser) return res.status(422).json({ error: "Error in google signin!" })

            const user = await this.userService.firstRow({ email: googleUser.email })

            // FIXME: All this logic should be in services
            if (user) {
                const newToken = jwt.sign({
                    email: user.email,
                }, process.env.JWT_SECRET_KEY, {
                    expiresIn: "7d"
                });

                user.token = newToken;
                user.save();

                const { email, token, is_admin } = user;
                const { picture: avatar, name, given_name: firstname, family_name: lastname } = googleUser;
                const result = {
                    email,
                    token: "test_token",
                    is_admin,
                    avatar,
                    name,
                    firstname,
                    lastname,
                    account_type: "google"
                }

                this.utilsService.sendEventWithPusher(result);
                return res.status(201).json({ data: result })
            } else {
                // FIXME: create user and usersaccount should be a transaction
                const createUser = await this.userService.create({
                    email: googleUser.email
                });

                const newToken = jwt.sign({ user: createUser }, process.env.JWT_SECRET_KEY, {
                    expiresIn: "7d"
                });

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
                    user_id: createUser.id
                });

                const { email, token } = createUser;
                const { avatar, name, firstname, lastname, account_type } = usersAccount;
                if (createUser && usersAccount) {
                    const result = {
                        email,
                        avatar,
                        name,
                        firstname,
                        lastname,
                        account_type,
                        token: "test_token"
                    }

                    this.utilsService.sendEventWithPusher(result);
                    return res.status(201).json({
                        data: result
                    });
                } else {
                    return res.status(500).json({ error: "signup failed due to server error!" })
                }
            }
        } catch (error) {
            return res.status(400).json({ error: error.message })
        }
    }

    signInWithEmailPassword = async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) return res.status(422).json({ error: "Invalid username or password" });

            const user = await this.userService.firstRow({ email: email })
            if (!user) return res.status(400).json({ error: "Email or username not found!" })

            const validPassword = await this.utilsService.comparePassword(password, user.password)
            if (!validPassword) return res.status(400).json({ error: "Wrong username or password" })

            user.token = ""
            const newToken = jwt.sign({ user: user }, process.env.JWT_SECRET_KEY, {
                expiresIn: "7d"
            });
            user.token = newToken;
            user.save();

            return res.status(201).json({ data: user })
        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }

    getUserInfo = async (req, res) => {
        try {
            const email = req.user?.email
            return res.status(200).json({ data: email })
        } catch (error) {
            return res.status(500).json({ error: error.message })
        }
    }

    filterUser = async (req, res) => {
        try {
            const { email } = req.query;

            console.log(email)
            const users = await this.userService.getUsersByFilters(email);
            console.log(users)

            return res.status(200).json({
                users
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
            }
            const userSignIn = await this.userService.signIn(userPayload);

            return res.status(200).json({
                data: userSignIn
            });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    };

    sendForgetPasswordLinkToEmail = async (req, res) => {
        try {
            const { email } = req.body;
            const userForgetPassword = await this.userService.sendForgetPasswordLink(email);

            return res.status(200).json({
                data: userForgetPassword
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    };

    sendForgetPasswordResetCode = async (req, res) => {
        try {
            const { email } = req.query;
            await this.userService.sendForgetPasswordResetCode(email).catch(error => {
                return res.status(500).json({ error })
            });

            return res.status(200).json({
                message: "Reset code sent!!!"
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    };

    resetPasswordEmail = async (req, res) => {
        try {
            const { email, reset_code } = req.query;
            const { new_password } = req.body
            const userResetPassword = await this.userService.resetPasswordEmail(email, reset_code, new_password);
            return res.status(200).json({
                ...userResetPassword
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    };

    getCurrentUser = async (req, res) => {
        try {
            const { id } = req.user
            const user = await this.userService.getCurrentUser(id)
            return res.status(200).json({
                user
            });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}

module.exports = UserController;
