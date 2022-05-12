const { Router } = require('express');
const { validateJWT } = require('../middlewares/Middleware');
const UserController = require('./UserController');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

const userController = new UserController();

router.post('/sign-in', userController.signIn);
router.post('/dashboard/sign-in', userController.signInAdmin);
router.post('/sign-up', userController.signUp);
router.post('/google/auth', userController.authGoogle);
router.post('/facebook/auth', userController.authFacebook);
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

router.get('/resend-otp', userController.resendOTP);
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

router.post('/facebook/deletion', userController.displayFacebookDeletion);
router.post('/oa', userController.createOA);
router.get('/oa/:user_id', userController.detailOA);
router.put('/oa/:user_id', userController.updateDetail);

module.exports = router;
