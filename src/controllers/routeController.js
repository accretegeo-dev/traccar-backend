const db = require('../db/connection');

// Get all routes
exports.getAllRoutes = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM custom_routes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
};

// Get routes by device ID
exports.getRoutesByDeviceId = async (req, res) => {
  const { deviceId } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM custom_routes WHERE device_id = $1 ORDER BY created_at DESC',
      [deviceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
};

// Get route by ID
exports.getRouteById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM custom_routes WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
};

// Create a new route
exports.createRoute = async (req, res) => {
  const { deviceId, name, description, positions = [], distance = 0, duration = 0, startTime, endTime } = req.body;

  if (!deviceId || !name) {
    return res.status(400).json({
      error: 'Missing required fields: deviceId, name',
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO custom_routes (device_id, name, description, positions, distance, duration, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [deviceId, name, description || null, positions, distance, duration, startTime || null, endTime || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create route' });
  }
};

// Update route
exports.updateRoute = async (req, res) => {
  const { id } = req.params;
  const { name, description, positions, distance, duration, startTime, endTime } = req.body;

  try {
    const result = await db.query(
      `UPDATE custom_routes 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           positions = COALESCE($3, positions),
           distance = COALESCE($4, distance),
           duration = COALESCE($5, duration),
           start_time = COALESCE($6, start_time),
           end_time = COALESCE($7, end_time),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, description, positions, distance, duration, startTime, endTime, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update route' });
  }
};

// Delete route
exports.deleteRoute = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM custom_routes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json({ message: 'Route deleted successfully', route: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete route' });
  }
};

// Add position to route
exports.addPositionToRoute = async (req, res) => {
  const { id } = req.params;
  const { positionId } = req.body;

  if (!positionId) {
    return res.status(400).json({ error: 'Missing positionId' });
  }

  try {
    const result = await db.query(
      `UPDATE custom_routes 
       SET positions = array_append(positions, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [positionId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add position to route' });
  }
};

// Remove position from route
exports.removePositionFromRoute = async (req, res) => {
  const { id } = req.params;
  const { positionId } = req.body;

  if (!positionId) {
    return res.status(400).json({ error: 'Missing positionId' });
  }

  try {
    const result = await db.query(
      `UPDATE custom_routes 
       SET positions = array_remove(positions, $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [positionId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove position from route' });
  }
};
