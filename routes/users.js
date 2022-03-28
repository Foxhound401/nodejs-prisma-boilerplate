const { Router } = require('express');
const UserController = require('../controllers/users');

const { authenticateJWT } = require('../middleware/auth');
const router = Router();

const userController = new UserController();

// router.post("/send-otp", userController.sendOTP);

// deprecated, should only be use for compatibility with older version
// use the new route `sign-in-with-otp`
// router.post("/sign-in", userController.signInWithOTP);
// router.post("/sign-in-otp", userController.signInWithOTP);

router.post('/sign-in', userController.signIn);
router.post('/sign-up', userController.signUp);

router.post('/verify-otp', authenticateJWT, userController.verifyOTP);
router.get('/resend-otp', authenticateJWT, userController.resendOTP);

router.post('/send-reset-password-otp', userController.sendResetPasswordOTP);
router.get('/resend-reset-password-otp', userController.resendResetPasswordOTP);
router.post(
  '/verify-reset-password-otp',
  userController.verifyResetPasswordOTP
);
router.post('/reset-password-otp', userController.resetPasswordOTP);

router.post('/reset-password', userController.resetPassword);

// router.post(
//   "/send-forget-password-link",
//   userController.sendForgetPasswordLinkToEmail
// );
// router.post(
//   "/send-forget-password-reset-code",
//   userController.sendForgetPasswordResetCode
// );

router.get('/sign-up-google', userController.signUpWithGoogle);
router.get('/sign-up-facebook', userController.signUpWithFacebook);
router.get('/sign-up-github', userController.signUpWithGithub);

router.get('/get-user-info', authenticateJWT, userController.getUserInfo);
router.put('', authenticateJWT, userController.updateUserProfile);
// router.get("/get-user-info", userController.getUserInfo);

router.get('/sign-up-sms', userController.signUpWithSMS);

router.get('/filter-user', authenticateJWT, userController.filterUser);

// signup with phone number
// + input phone_number
// + send phone number to server => server take phone_number and send sms with otp in it to users
// + user send otp to users routes. => verify otp, check if user exist => create token and let in
// => create a new account if user not in the system.

module.exports = router;
