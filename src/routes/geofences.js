const express = require('express');
const router = express.Router();
const geofenceController = require('../controllers/geofenceController');

router.get('/', geofenceController.getAllGeofences);

module.exports = router;

