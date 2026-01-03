const db = require('../db/connection');

exports.getAllGeofences = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name FROM public.tc_geofences ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch geofences', err);
    res.json([]);
  }
};

