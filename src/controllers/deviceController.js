const db = require('../db/connection');

// Get all devices
exports.getAllDevices = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, uniqueId FROM devices ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

// Get device by ID
exports.getDeviceById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT id, name, uniqueId FROM devices WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
};
