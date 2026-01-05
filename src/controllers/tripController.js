const db = require('../db/connection');

exports.getOverrides = async (req, res) => {
  try {
    const { deviceId } = req.query;
    let query = 'SELECT start_position_id AS "startPositionId", device_id AS "deviceId", edited FROM trip_overrides';
    const params = [];
    if (deviceId) {
      query += ' WHERE device_id = $1';
      params.push(parseInt(deviceId, 10));
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trip overrides' });
  }
};

exports.putOverride = async (req, res) => {
  try {
    const { startPositionId } = req.params;
    const { deviceId, edited } = req.body || {};
    if (!startPositionId || !deviceId || !edited || typeof edited !== 'object') {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = parseInt(startPositionId, 10);
    const devId = parseInt(deviceId, 10);
    const result = await db.query(
      `
      INSERT INTO trip_overrides (start_position_id, device_id, edited, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT (start_position_id)
      DO UPDATE SET edited = EXCLUDED.edited, device_id = EXCLUDED.device_id, updated_at = NOW()
      RETURNING start_position_id AS "startPositionId", device_id AS "deviceId", edited
      `,
      [id, devId, JSON.stringify(edited)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save trip override' });
  }
};

exports.bulkSaveOverrides = async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!items || typeof items !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const results = [];
    for (const [startPositionId, payload] of Object.entries(items)) {
      const { deviceId, edited } = payload || {};
      if (!deviceId || !edited || typeof edited !== 'object') {
        continue;
      }
      const id = parseInt(startPositionId, 10);
      const devId = parseInt(deviceId, 10);
      const r = await db.query(
        `
        INSERT INTO trip_overrides (start_position_id, device_id, edited, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (start_position_id)
        DO UPDATE SET edited = EXCLUDED.edited, device_id = EXCLUDED.device_id, updated_at = NOW()
        RETURNING start_position_id AS "startPositionId", device_id AS "deviceId", edited
        `,
        [id, devId, JSON.stringify(edited)]
      );
      results.push(r.rows[0]);
    }
    res.json({ saved: results.length, overrides: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save trip overrides' });
  }
};

