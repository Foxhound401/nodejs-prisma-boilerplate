const { Router } = require('express');
const TestbedController = require('./TestBedController')

const router = Router();

const testbedController = new TestbedController();

router.get('/soxbox-craw', validateJWT, testbedController.getUserInfo);
router.get('/sunsystem-simuate', validateJWT, testbedController.getCurrentUser);

module.exports = router;
