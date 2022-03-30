const { Router } = require('express');
const { validateJWT } = require('../middlewares/Middleware');
const UserController = require('./UserController');
const validator = require('../middlewares/Validator');
const UserSchema = require('./UserValidator');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

const userController = new UserController();

router.post('/sign-in', validator(UserSchema.signIn), userController.signIn);
router.post('/sign-up', validator(UserSchema.signUp), userController.signUp);
router.get('/get-user-info', validateJWT, userController.getUserInfo);
router.get('/profile', validateJWT, userController.getCurrentUser);
router.put('/', validateJWT, userController.updateUserProfile);

router.post(
  '/:id/avatar/upload',
  upload.single('file'),
  validateJWT,
  userController.updateUserAvatar
);
router.post(
  '/:id/cover/upload',
  upload.single('file'),
  validateJWT,
  userController.updateUserCover
);

// TODO: check reset token for signup
// these are for signup i think
router.get('/resend-otp', validateJWT, userController.resendOTP);
router.post('/verify-otp', validateJWT, userController.verifyOTP);

// TODO: call api for reset password
// these two been verified
router.post(
  '/otp/password/send-request-reset',
  userController.sendResetPasswordOTP
);
router.get(
  '/otp/password/resend-request-reset',
  userController.resendResetPasswordOTP
);

// TODO: check code for api verify rest password
router.post(
  '/otp/password/verify-request-reset',
  userController.verifyResetPasswordOTP
);

// TODO: check this api
router.post('/otp/password/reset', userController.resetPassword);

module.exports = router;
