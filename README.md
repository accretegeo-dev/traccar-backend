# Traccar Positions & Routes node-API

Express.js backend server for managing custom positions and routes in Traccar Web with PostgreSQL integration.

## Features

- ✅ CRUD operations for positions
- ✅ CRUD operations for routes
- ✅ Position-to-route associations
- ✅ Date range filtering for positions
- ✅ Device-based filtering
- ✅ PostgreSQL integration
- ✅ CORS enabled

## Prerequisites

- Node.js 14+
- PostgreSQL 12+
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
DATABASE_URL=postgresql://postgres:accrete@localhost:5432/traccar
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

3. Start the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000` and automatically create the required database tables.

## node-API Endpoints

### Positions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/node-api/custom-positions` | Get all positions |
| GET | `/node-api/custom-positions/:id` | Get position by ID |
| GET | `/node-api/custom-positions/device/:deviceId` | Get positions by device |
| GET | `/node-api/custom-positions/range?deviceId=X&fromDate=Y&toDate=Z` | Get positions in date range |
| POST | `/node-api/custom-positions` | Create new position |
| PUT | `/node-api/custom-positions/:id` | Update position |
| DELETE | `/node-api/custom-positions/:id` | Delete position |

### Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/node-api/custom-routes` | Get all routes |
| GET | `/node-api/custom-routes/:id` | Get route by ID |
| GET | `/node-api/custom-routes/device/:deviceId` | Get routes by device |
| POST | `/node-api/custom-routes` | Create new route |
| PUT | `/node-api/custom-routes/:id` | Update route |
| POST | `/node-api/custom-routes/:id/positions` | Add position to route |
| DELETE | `/node-api/custom-routes/:id/positions` | Remove position from route |
| DELETE | `/node-api/custom-routes/:id` | Delete route |

## Example Requests

### Create Position
```bash
curl -X POST http://localhost:5000/node-api/custom-positions \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": 1,
    "latitude": 13.3334,
    "longitude": 75.7689,
    "speed": 45.5,
    "address": "City Center",
    "fixTime": "2025-12-23T11:50:00Z"
  }'
```

### Create Route
```bash
curl -X POST http://localhost:5000/node-api/custom-routes \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": 1,
    "name": "Morning Route",
    "description": "Route from office to delivery points",
    "positions": [1, 2, 3],
    "distance": 15.5,
    "duration": 1800,
    "startTime": "2025-12-23T08:00:00Z",
    "endTime": "2025-12-23T08:30:00Z"
  }'
```

### Update Position
```bash
curl -X PUT http://localhost:5000/node-api/custom-positions/1 \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 13.3335,
    "longitude": 75.7690,
    "speed": 50.0,
    "address": "Updated Location"
  }'
```

## Database Schema

### custom_positions table
- `id` (INTEGER PRIMARY KEY)
- `device_id` (INTEGER)
- `latitude` (DOUBLE PRECISION)
- `longitude` (DOUBLE PRECISION)
- `speed` (DOUBLE PRECISION)
- `address` (VARCHAR)
- `fix_time` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### custom_routes table
- `id` (INTEGER PRIMARY KEY)
- `device_id` (INTEGER)
- `name` (VARCHAR)
- `description` (TEXT)
- `positions` (INTEGER ARRAY)
- `distance` (DOUBLE PRECISION)
- `duration` (INTEGER)
- `start_time` (TIMESTAMP)
- `end_time` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Development

Run tests:
```bash
npm test
```

## License

MIT
