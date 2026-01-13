const db = require('../db/connection');

const toRad = (v) => v * Math.PI / 180;
const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
const bearingDegrees = (lat1, lon1, lat2, lon2) => {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
};
const msToKnots = (ms) => ms * 1.943844;

// Get all positions or filter by deviceIds and date range (Traccar positions table)
exports.getAllPositions = async (req, res) => {
  try {
    const { deviceId, from, to } = req.query;
    
    let query = 'SELECT id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime" FROM public.tc_positions';
    const params = [];

    if (deviceId || from || to) {
      const conditions = [];
      
      if (deviceId) {
        const deviceIds = Array.isArray(deviceId) ? deviceId : [deviceId];
        const placeholders = deviceIds.map((_, i) => `$${params.length + i + 1}`).join(',');
        conditions.push(`deviceid IN (${placeholders})`);
        params.push(...deviceIds.map(id => parseInt(id)));
      }
      
      if (from) {
        conditions.push(`fixtime >= $${params.length + 1}`);
        params.push(new Date(from));
      }
      
      if (to) {
        conditions.push(`fixtime <= $${params.length + 1}`);
        params.push(new Date(to));
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    
    query += ' ORDER BY "fixTime" DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
};

// Get positions by device ID
exports.getPositionsByDeviceId = async (req, res) => {
  const { deviceId } = req.params;
  try {
    const result = await db.query(
      'SELECT id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime" FROM public.tc_positions WHERE deviceid = $1 ORDER BY fixtime DESC',
      [deviceId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
};

// Get position by ID
exports.getPositionById = async (req, res) => {
  const { id } = req.params;
  const idNum = parseInt(id, 10);
  if (Number.isNaN(idNum)) {
    return res.status(400).json({ error: 'Invalid position id' });
  }
  try {
    const result = await db.query(
      'SELECT id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime" FROM public.tc_positions WHERE id = $1',
      [idNum]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch position' });
  }
};

// Create a new position (writes into Traccar positions table)
exports.createPosition = async (req, res) => {
  const { deviceId, latitude, longitude, speed = 0, address, fixTime } = req.body;

  // Validation
  if (!deviceId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: deviceId, latitude, longitude',
    });
  }

  try {
    const now = new Date();
    const devicetime = fixTime ? new Date(fixTime) : now;
    const fixtime = fixTime ? new Date(fixTime) : now;
    const valid = true;
    const lastRes = await db.query(
      'SELECT id, latitude, longitude, speed, address, altitude, course, accuracy, network, protocol, fixtime, attributes FROM public.tc_positions WHERE deviceid = $1 ORDER BY fixtime DESC LIMIT 1',
      [deviceId],
    );
    const last = lastRes.rows[0];
    const protocol = last?.protocol || 'web';
    const altitude = last?.altitude ?? 0;
    let course = 0;
    let distance = 0;
    let totalDistance = null;
    if (last) {
      distance = haversineMeters(last.latitude, last.longitude, latitude, longitude);
      course = distance > 0 ? bearingDegrees(last.latitude, last.longitude, latitude, longitude) : (last.course || 0);
      try {
        const lastAttrs = last.attributes ? JSON.parse(last.attributes) : {};
        const prevTotal = Number.isFinite(lastAttrs.totalDistance) ? lastAttrs.totalDistance : null;
        totalDistance = prevTotal != null ? prevTotal + distance : null;
      } catch {
        totalDistance = null;
      }
    }
    let speedKnots = speed || 0;
    if (!speedKnots && last) {
      const dt = (fixtime - new Date(last.fixtime)) / 1000;
      if (dt > 0) {
        speedKnots = msToKnots(distance / dt);
      }
    }
    const motion = speedKnots > 0.5;
    let attributes = {};
    try {
      attributes = last?.attributes ? JSON.parse(last.attributes) : {};
    } catch {
      attributes = {};
    }
    attributes.distance = distance;
    attributes.totalDistance = totalDistance;
    attributes.motion = motion;
    const accuracy = last?.accuracy ?? 0;
    const network = last?.network ?? null;

    const result = await db.query(
      `INSERT INTO public.tc_positions (
         protocol, deviceid, servertime, devicetime, fixtime, valid,
         latitude, longitude, altitude, speed, course, address, attributes, accuracy, network
       )
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime"`,
      [
        protocol,
        deviceId,
        devicetime,
        fixtime,
        valid,
        latitude,
        longitude,
        altitude,
        speedKnots,
        course,
        address || null,
        JSON.stringify(attributes),
        accuracy,
        network,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create position' });
  }
};

// Update position (updates Traccar positions table)
exports.updatePosition = async (req, res) => {
  const { id } = req.params;
  const idNum = parseInt(id, 10);
  if (Number.isNaN(idNum)) {
    return res.status(400).json({ error: 'Invalid position id' });
  }
  const { latitude, longitude, speed, address, fixTime } = req.body;

  try {
    const currentRes = await db.query(
      'SELECT id, deviceid, latitude, longitude, speed, address, altitude, course, accuracy, network, fixtime, attributes FROM public.tc_positions WHERE id = $1',
      [idNum],
    );
    const current = currentRes.rows[0];
    if (current) {
      const targetLat = latitude != null ? latitude : current.latitude;
      const targetLng = longitude != null ? longitude : current.longitude;
      const targetFix = fixTime ? new Date(fixTime) : new Date(current.fixtime);
      const prevRes = await db.query(
        'SELECT id, latitude, longitude, fixtime, attributes FROM public.tc_positions WHERE deviceid = $1 AND fixtime < $2 ORDER BY fixtime DESC LIMIT 1',
        [current.deviceid, targetFix],
      );
      const prev = prevRes.rows[0];
      let distance = 0;
      let course = current.course || 0;
      let totalDistance = null;
      if (prev) {
        distance = haversineMeters(prev.latitude, prev.longitude, targetLat, targetLng);
        course = distance > 0 ? bearingDegrees(prev.latitude, prev.longitude, targetLat, targetLng) : course;
        try {
          const prevAttrs = prev.attributes ? JSON.parse(prev.attributes) : {};
          const prevTotal = Number.isFinite(prevAttrs.totalDistance) ? prevAttrs.totalDistance : null;
          totalDistance = prevTotal != null ? prevTotal + distance : null;
        } catch {
          totalDistance = null;
        }
      }
      let speedKnots = speed != null ? speed : current.speed;
      if ((!speedKnots || speedKnots === 0) && prev) {
        const dt = (targetFix - new Date(prev.fixtime)) / 1000;
        if (dt > 0) {
          speedKnots = msToKnots(distance / dt);
        }
      }
      const motion = speedKnots > 0.5;
      let attributes = {};
      try {
        attributes = current.attributes ? JSON.parse(current.attributes) : {};
      } catch {
        attributes = {};
      }
      attributes.distance = distance;
      attributes.totalDistance = totalDistance;
      attributes.motion = motion;
      const updated = await db.query(
        `UPDATE public.tc_positions 
         SET latitude = $1,
             longitude = $2,
             speed = $3,
             address = COALESCE($4, address),
             fixtime = $5,
             course = $6,
             attributes = $7
         WHERE id = $8
         RETURNING id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime"`,
        [targetLat, targetLng, speedKnots, address, targetFix, course, JSON.stringify(attributes), idNum],
      );
      return res.json(updated.rows[0]);
    }

    if (result.rows.length === 0) {
      const now = new Date();
      const devicetime = fixTime ? new Date(fixTime) : now;
      const fixtime = fixTime ? new Date(fixTime) : now;
      const valid = true;
      const lastRes = await db.query(
        'SELECT id, latitude, longitude, speed, address, altitude, protocol, fixtime, attributes FROM public.tc_positions WHERE deviceid = $1 ORDER BY fixtime DESC LIMIT 1',
        [req.body.deviceId],
      );
      const last = lastRes.rows[0];
      const protocol = last?.protocol || 'web';
      const altitude = last?.altitude ?? 0;
      let course = 0;
      let distance = 0;
      let totalDistance = null;
      if (last && latitude != null && longitude != null) {
        distance = haversineMeters(last.latitude, last.longitude, latitude, longitude);
        course = distance > 0 ? bearingDegrees(last.latitude, last.longitude, latitude, longitude) : (last.course || 0);
        try {
          const lastAttrs = last.attributes ? JSON.parse(last.attributes) : {};
          const prevTotal = Number.isFinite(lastAttrs.totalDistance) ? lastAttrs.totalDistance : null;
          totalDistance = prevTotal != null ? prevTotal + distance : null;
        } catch {
          totalDistance = null;
        }
      }
      let speedKnots = speed || 0;
      if (!speedKnots && last && latitude != null && longitude != null) {
        const dt = (fixtime - new Date(last.fixtime)) / 1000;
        if (dt > 0) {
          speedKnots = msToKnots(distance / dt);
        }
      }
      const motion = speedKnots > 0.5;
      const attributes = JSON.stringify({
        distance,
        totalDistance,
        motion,
      });

      const insert = await db.query(
        `INSERT INTO public.tc_positions (
           protocol, deviceid, servertime, devicetime, fixtime, valid,
           latitude, longitude, altitude, speed, course, address, attributes, accuracy, network
         )
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime"`,
        [
          protocol,
          req.body.deviceId,
          devicetime,
          fixtime,
          valid,
          latitude,
          longitude,
          altitude,
          speedKnots,
          course,
          address || null,
          attributes,
          0,
          null,
        ],
      );
      return res.json(insert.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update position' });
  }
};

// Delete position (from Traccar positions table)
exports.deletePosition = async (req, res) => {
  const { id } = req.params;
  const idNum = parseInt(id, 10);
  if (Number.isNaN(idNum)) {
    return res.status(400).json({ error: 'Invalid position id' });
  }

  try {
    const result = await db.query(
      'DELETE FROM public.tc_positions WHERE id = $1 RETURNING id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime"',
      [idNum]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    res.json({ message: 'Position deleted successfully', position: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete position' });
  }
};

// Get positions in date range
exports.getPositionsByDateRange = async (req, res) => {
  const { deviceId, fromDate, toDate } = req.query;

  if (!deviceId || !fromDate || !toDate) {
    return res.status(400).json({
      error: 'Missing required query params: deviceId, fromDate, toDate',
    });
  }

  try {
    const result = await db.query(
      `SELECT id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime"
       FROM public.tc_positions 
       WHERE deviceid = $1 AND fixtime BETWEEN $2 AND $3
       ORDER BY fixtime DESC`,
      [deviceId, new Date(fromDate), new Date(toDate)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
};

// Copy positions from source date to target date for a specific device
exports.copyPositionsToDate = async (req, res) => {
  const { deviceId, sourceDate, targetDate } = req.body;

  // Validation
  if (!deviceId || !sourceDate || !targetDate) {
    return res.status(400).json({
      error: 'Missing required fields: deviceId, sourceDate, targetDate',
    });
  }

  try {
    // Parse dates to get start and end of day
    const sourceStart = new Date(sourceDate);
    sourceStart.setHours(0, 0, 0, 0);
    const sourceEnd = new Date(sourceDate);
    sourceEnd.setHours(23, 59, 59, 999);

    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);

    // Calculate time offset in milliseconds
    const timeOffset = targetStart - sourceStart;

    // Fetch all positions for the source date
    const sourcePositions = await db.query(
      `SELECT * FROM public.tc_positions 
       WHERE deviceid = $1 AND fixtime >= $2 AND fixtime <= $3
       ORDER BY fixtime ASC`,
      [deviceId, sourceStart, sourceEnd]
    );

    if (sourcePositions.rows.length === 0) {
      return res.status(404).json({ error: 'No positions found for the source date' });
    }

    // Insert copied positions with adjusted dates
    const insertedPositions = [];
    for (const pos of sourcePositions.rows) {
      const newFixTime = new Date(new Date(pos.fixtime).getTime() + timeOffset);
      const newDeviceTime = new Date(new Date(pos.devicetime).getTime() + timeOffset);
      const newServerTime = new Date(new Date(pos.servertime).getTime() + timeOffset);

      const result = await db.query(
        `INSERT INTO public.tc_positions (
           protocol, deviceid, servertime, devicetime, fixtime, valid,
           latitude, longitude, altitude, speed, course, address, attributes, accuracy, network
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime"`,
        [
          pos.protocol,
          pos.deviceid,
          newServerTime,
          newDeviceTime,
          newFixTime,
          pos.valid,
          pos.latitude,
          pos.longitude,
          pos.altitude,
          pos.speed,
          pos.course,
          pos.address,
          pos.attributes,
          pos.accuracy,
          pos.network,
        ]
      );
      insertedPositions.push(result.rows[0]);
    }

    res.status(201).json({
      message: `Successfully copied ${insertedPositions.length} positions`,
      count: insertedPositions.length,
      positions: insertedPositions,
    });
  } catch (err) {
    console.error('Error copying positions:', err);
    res.status(500).json({ error: 'Failed to copy positions' });
  }
};

// Export positions as CSV
exports.getPositionsCsv = async (req, res) => {
  try {
    // Reuse filters from getAllPositions
    const { deviceId, from, to } = req.query;
    let query = 'SELECT id, deviceid AS "deviceId", latitude, longitude, speed, address, fixtime AS "fixTime" FROM public.tc_positions';
    const params = [];
    if (deviceId || from || to) {
      const conditions = [];
      if (deviceId) {
        const deviceIds = Array.isArray(deviceId) ? deviceId : [deviceId];
        const placeholders = deviceIds.map((_, i) => `$${params.length + i + 1}`).join(',');
        conditions.push(`deviceid IN (${placeholders})`);
        params.push(...deviceIds.map((id) => parseInt(id)));
      }
      if (from) {
        conditions.push(`fixtime >= $${params.length + 1}`);
        params.push(new Date(from));
      }
      if (to) {
        conditions.push(`fixtime <= $${params.length + 1}`);
        params.push(new Date(to));
      }
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    query += ' ORDER BY fixtime DESC';
    const result = await db.query(query, params);
    const rows = result.rows;
    const header = ['id', 'deviceId', 'latitude', 'longitude', 'speed', 'address', 'fixTime'];
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const csv = [header.join(',')]
      .concat(rows.map((r) => header.map((h) => escape(r[h])).join(',')))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="positions.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export positions' });
  }
};
