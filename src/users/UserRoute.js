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

router.get('/resend-otp', validateJWT, userController.resendOTP);
router.post('/verify-otp', validateJWT, userController.verifyOTP);

router.post('/send-reset-password-otp', userController.sendResetPasswordOTP);
router.get('/resend-reset-password-otp', userController.resendResetPasswordOTP);

router.post(
  '/verify-reset-password-otp',
  userController.verifyResetPasswordOTP
);
router.post('/reset-password-otp', userController.resetPassword);

module.exports = router;
