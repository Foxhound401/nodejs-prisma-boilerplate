const {
    Router
} = require('express');
const authController = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');
const router = Router();

router.get('/auth-services', authMiddleware.authenticateJWT, authController.auth);

// TODO: 
// This essentially just need one route /auth and the client need to pass a parameter to 
// determine what method being used.
router.get('/auth-google', authController.getGoogleAuthUrl);
router.get('/auth-facebook', authController.getFacebookAuthUrl);
router.get('/auth-github', authController.getGithubAuthUrl);

router.get('/auth-twilio', authController.sendOtpTwilio);


module.exports = router;
