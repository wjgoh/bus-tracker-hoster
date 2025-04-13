# Bus Tracker - GTFS-Realtime Data Parser

This application fetches real-time vehicle position data from the Malaysian government API in GTFS-Realtime format and stores it in a PostgreSQL database.

## Setup Instructions

1. Install Node.js dependencies:

   ```
   npm install
   ```

2. Configure the environment variables in `.env` file:

   - Set DATABASE_URL for your PostgreSQL database connection
   - The API URL for GTFS-Realtime data

3. Make sure your PostgreSQL database is running

4. Start the application:
   ```
   npm start
   ```

## Features

- Fetches GTFS-Realtime data every 30 seconds
- Parses binary GTFS (General Transit Feed Specification) real-time data
- Stores vehicle positions in a PostgreSQL database
- Includes error handling and logging

## About GTFS-Realtime

GTFS-Realtime is a feed specification that allows public transportation agencies to provide real-time updates about their fleet. It uses Protocol Buffers (a compact binary format) rather than JSON or XML, which is why specialized parsing is required.

## Troubleshooting

If you see errors about parsing JSON, make sure you're handling the API response as binary data and using the GTFS-Realtime bindings to decode it.

## Database Schema

The application creates a `vehicle_positions` table with the following structure:

```sql
CREATE TABLE vehicle_positions (
  id SERIAL PRIMARY KEY,
  vehicle_id VARCHAR(100),
  route_id VARCHAR(100),
  trip_id VARCHAR(100),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  bearing FLOAT,
  speed FLOAT,
  timestamp BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Logs

The application generates logs in:

- `combined.log` - All logs
- `error.log` - Error logs only
