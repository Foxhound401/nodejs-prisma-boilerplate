const { Router } = require('express');
const testbedRoutes = require('./testbed/TestBedRoute')
const router = Router();

router.get('/health', (req, res) => res.send('hello sso'));

router.use('/testbed', testbedRoutes)


module.exports = router;
