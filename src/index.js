const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeDatabase } = require('./db/initialize');
const { seedDevices } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for VPS/CORS server usage
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const positionRoutes = require('./routes/positions');
const routeRoutes = require('./routes/routes');
const deviceRoutes = require('./routes/devices');
const geofenceRoutes = require('./routes/geofences');

app.use('/node-api/custom-positions', positionRoutes);
app.use('/node-api/custom-routes', routeRoutes);
app.use('/node-api/devices', deviceRoutes);
app.use('/node-api/geofences', geofenceRoutes);

// Health check endpoint
app.get('/node-api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server and initialize database
const startServer = async () => {
  try {
    await initializeDatabase();
    await seedDevices();
    app.listen(PORT, () => {
      console.log(`✓ Server is running on http://localhost:${PORT}`);
      console.log(`✓ Database URL: ${process.env.DATABASE_URL}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
