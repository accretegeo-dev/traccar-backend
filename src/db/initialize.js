const db = require('../db/connection');

// Create positions table if not exists
const initializeDatabase = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        uniqueId VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS custom_positions (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        speed DOUBLE PRECISION DEFAULT 0,
        address VARCHAR(255),
        fix_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS custom_routes (
        id SERIAL PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        positions INTEGER[] DEFAULT '{}',
        distance DOUBLE PRECISION DEFAULT 0,
        duration INTEGER DEFAULT 0,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);
      CREATE INDEX IF NOT EXISTS idx_positions_device_id ON custom_positions(device_id);
      CREATE INDEX IF NOT EXISTS idx_routes_device_id ON custom_routes(device_id);

      CREATE TABLE IF NOT EXISTS trip_overrides (
        start_position_id BIGINT PRIMARY KEY,
        device_id INTEGER NOT NULL REFERENCES devices(id),
        edited JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_trip_overrides_device_id ON trip_overrides(device_id);
    `);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

module.exports = { initializeDatabase };
