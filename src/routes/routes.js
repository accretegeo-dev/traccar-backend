const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

// Get all routes
router.get('/', routeController.getAllRoutes);

// Get routes by device ID
router.get('/device/:deviceId', routeController.getRoutesByDeviceId);

// Get route by ID
router.get('/:id', routeController.getRouteById);

// Create a new route
router.post('/', routeController.createRoute);

// Update route
router.put('/:id', routeController.updateRoute);

// Add position to route
router.post('/:id/positions', routeController.addPositionToRoute);

// Remove position from route
router.delete('/:id/positions', routeController.removePositionFromRoute);

// Delete route
router.delete('/:id', routeController.deleteRoute);

module.exports = router;
