const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:accrete@localhost:5432/traccar',
});

async function verify() {
  try {
    console.log('\n=== VERIFYING COPIED POSITIONS ===\n');
    
    // 1. Check if positions exist for device on target date
    const deviceId = 1;
    const targetDate = '2026-01-09';
    
    const positionsCheck = await pool.query(`
      SELECT 
        COUNT(*) as count,
        MIN(fixtime) as first_position,
        MAX(fixtime) as last_position,
        AVG(speed) as avg_speed
      FROM public.tc_positions
      WHERE deviceid = $1 
      AND fixtime >= $2::date 
      AND fixtime < ($2::date + interval '1 day')
    `, [deviceId, targetDate]);
    
    console.log(`Device ${deviceId} on ${targetDate}:`);
    console.log(`  Positions: ${positionsCheck.rows[0].count}`);
    console.log(`  First: ${positionsCheck.rows[0].first_position}`);
    console.log(`  Last: ${positionsCheck.rows[0].last_position}`);
    console.log(`  Avg Speed: ${positionsCheck.rows[0].avg_speed}`);
    
    // 2. Check device reference
    const deviceCheck = await pool.query(`
      SELECT id, name, positionid, lastupdate
      FROM public.tc_devices
      WHERE id = $1
    `, [deviceId]);
    
    console.log(`\nDevice Info:`);
    console.log(`  Name: ${deviceCheck.rows[0]?.name}`);
    console.log(`  Position ID: ${deviceCheck.rows[0]?.positionid}`);
    console.log(`  Last Update: ${deviceCheck.rows[0]?.lastupdate}`);
    
    // 3. Check if the positionid points to a valid position
    if (deviceCheck.rows[0]?.positionid) {
      const posCheck = await pool.query(`
        SELECT id, fixtime, latitude, longitude, speed
        FROM public.tc_positions
        WHERE id = $1
      `, [deviceCheck.rows[0].positionid]);
      
      console.log(`\nCurrent Position (positionid ${deviceCheck.rows[0].positionid}):`);
      if (posCheck.rows[0]) {
        console.log(`  Time: ${posCheck.rows[0].fixtime}`);
        console.log(`  Location: ${posCheck.rows[0].latitude}, ${posCheck.rows[0].longitude}`);
        console.log(`  Speed: ${posCheck.rows[0].speed}`);
      } else {
        console.log(`  ❌ Position not found!`);
      }
    }
    
    // 4. Check for motion patterns (critical for trip detection)
    const motionCheck = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE speed > 0) as moving_count,
        COUNT(*) FILTER (WHERE speed = 0) as stopped_count,
        MAX(speed) as max_speed,
        COUNT(*) as total
      FROM public.tc_positions
      WHERE deviceid = $1 
      AND fixtime >= $2::date 
      AND fixtime < ($2::date + interval '1 day')
    `, [deviceId, targetDate]);
    
    console.log(`\nMotion Analysis (${targetDate}):`);
    console.log(`  Moving positions: ${motionCheck.rows[0].moving_count}`);
    console.log(`  Stopped positions: ${motionCheck.rows[0].stopped_count}`);
    console.log(`  Max speed: ${motionCheck.rows[0].max_speed}`);
    console.log(`  Total: ${motionCheck.rows[0].total}`);
    
    if (motionCheck.rows[0].moving_count === 0) {
      console.log('\n  ⚠️  WARNING: No positions with speed > 0!');
      console.log('  Traccar may not detect any trips if all speeds are 0.');
    }
    
    // 5. Sample positions
    const samplePositions = await pool.query(`
      SELECT id, fixtime, latitude, longitude, speed, attributes
      FROM public.tc_positions
      WHERE deviceid = $1 
      AND fixtime >= $2::date 
      AND fixtime < ($2::date + interval '1 day')
      ORDER BY fixtime
      LIMIT 5
    `, [deviceId, targetDate]);
    
    console.log(`\nSample Positions (first 5):`);
    samplePositions.rows.forEach((pos, idx) => {
      const attrs = pos.attributes ? JSON.parse(pos.attributes) : {};
      console.log(`  ${idx + 1}. ID:${pos.id} Time:${pos.fixtime.toISOString()} Speed:${pos.speed} Motion:${attrs.motion}`);
    });
    
    console.log('\n=== VERIFICATION COMPLETE ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

verify();
