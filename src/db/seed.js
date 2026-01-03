const db = require('./connection');

// Seed test devices
const seedDevices = async () => {
  try {
    const devices = [
      { name: 'Vehicle 1', uniqueId: 'DEVICE001' },
      { name: 'Vehicle 2', uniqueId: 'DEVICE002' },
      { name: 'Vehicle 3', uniqueId: 'DEVICE003' },
      { name: 'Truck 1', uniqueId: 'TRUCK001' },
      { name: 'Truck 2', uniqueId: 'TRUCK002' },
    ];

    for (const device of devices) {
      await db.query(
        'INSERT INTO devices (name, uniqueId) VALUES ($1, $2) ON CONFLICT (uniqueId) DO NOTHING',
        [device.name, device.uniqueId]
      );
    }

    console.log('✓ Test devices seeded successfully');
  } catch (err) {
    console.error('Error seeding devices:', err);
  }
};

module.exports = { seedDevices };
