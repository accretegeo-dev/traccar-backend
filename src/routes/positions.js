const express = require('express');
const router = express.Router();
const positionController = require('../controllers/positionController');

// Get all positions (with optional filters: deviceId, from, to)
router.get('/', positionController.getAllPositions);
router.get('/csv', positionController.getPositionsCsv);

// Copy positions from one day to another
router.post('/copy', positionController.copyPositionsToDate);

// Get position by ID
router.get('/:id(\\d+)', positionController.getPositionById);

// Create a new position
router.post('/', positionController.createPosition);

// Update position
router.put('/:id(\\d+)', positionController.updatePosition);

// Delete position
router.delete('/:id(\\d+)', positionController.deletePosition);

module.exports = router;
