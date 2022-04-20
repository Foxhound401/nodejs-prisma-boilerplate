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
// After signup OTP flow should be applied
// that is:
// signup -> SendOTP -> VerifyOTP/ResendOTP ->
router.get('/get-user-info', userController.getUserInfo);
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
router.post('/verify-otp', userController.verifyOTP);

router.post(
  '/otp/password/send-request-reset',
  userController.sendResetPasswordOTP
);
router.get(
  '/otp/password/resend-request-reset',
  userController.resendResetPasswordOTP
);
router.post(
  '/otp/password/verify-request-reset',
  userController.verifyResetPasswordOTP
);
router.post('/otp/password/reset', userController.resetPassword);

router.delete('/:id', userController.deleteUser);
router.get('/search/:search_input', validateJWT, userController.search);

module.exports = router;
