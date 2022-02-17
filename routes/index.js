const {
    Router
} = require('express');
const userRoutes = require('./users');
const authRoutes = require('./auth');
const router = Router();

router.get('/', (req, res) => res.send("hello sso"));

router.use('/users', userRoutes);
router.use('/', authRoutes);

module.exports = router;
