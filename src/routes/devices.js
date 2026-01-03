const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Get all devices
router.get('/', deviceController.getAllDevices);

// Get device by ID
router.get('/:id', deviceController.getDeviceById);

module.exports = router;
