const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

router.get('/overrides', tripController.getOverrides);
router.put('/overrides/:startPositionId', tripController.putOverride);
router.post('/overrides', tripController.bulkSaveOverrides);

module.exports = router;

