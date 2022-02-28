const { Router } = require('express');
const UserController = require('../controllers/users');

const { authenticateJWT } = require('../middleware/auth');
const router = Router();

const userController = new UserController;

router.post('/send-otp', userController.sendOTP);

// deprecated, should only be use for compatibility with older version
// use the new route `sign-in-with-otp`
router.post('/sign-in', userController.signInWithOTP);
router.post('/sign-in-otp', userController.signInWithOTP);

router.post('/sign-in-email-password', userController.signInWithEmailPassword);
router.post('/sign-up-email-password', userController.signUpWithEmailPassword);

router.post('/send-forget-password-link', userController.sendForgetPasswordLinkToEmail);
router.post('/send-forget-password-reset-code', userController.sendForgetPasswordResetCode);
router.post('/reset-password-email', userController.resetPasswordEmail);

router.get('/sign-up-google', userController.signUpWithGoogle);
router.get('/sign-up-facebook', userController.signUpWithFacebook);
router.get('/sign-up-github', userController.signUpWithGithub);
router.get('/get-user-info', authenticateJWT, userController.getUserInfo);

router.get('/sign-up-sms', userController.signUpWithSMS);

router.get('/filter-user', authenticateJWT, userController.filterUser);


// signup with phone number
// + input phone_number
// + send phone number to server => server take phone_number and send sms with otp in it to users
// + user send otp to users routes. => verify otp, check if user exist => create token and let in 
// => create a new account if user not in the system.




module.exports = router;
