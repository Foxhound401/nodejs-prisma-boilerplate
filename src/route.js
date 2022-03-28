const { Router } = require('express');
const userRoutes = require('./users/UserRoute');
const router = Router();

router.get('/', (req, res) => res.send('hello sso'));

router.use('/users', userRoutes);

module.exports = router;
