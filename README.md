# Bus Tracker

A real-time bus tracking service that fetches and processes data from the Malaysian government's GTFS-realtime API for Rapid Bus and MRT feeder services.

## Overview

This application fetches vehicle position data from the public transit API at regular intervals, parses the GTFS-realtime protocol buffer data, and stores the processed information in a PostgreSQL database. It keeps track of active bus positions, routes, and status information.

## Features

- Fetches real-time bus location data every 30 seconds
- Processes GTFS-realtime protocol buffer data
- Stores vehicle positions in a PostgreSQL database
- Tracks which buses are active
- Handles data validation and error recovery
- Comprehensive logging

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Internet connection to access the API

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd bus-tracker-hoster
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your PostgreSQL connection string:
   ```
   DATABASE_URL={your postgreSQL info}
   ```

## Usage

To start the bus tracker service:

```bash
npm start
```

The application will:

1. Initialize the database and create the necessary tables if they don't exist
2. Start fetching data at 30-second intervals
3. Log operations to both the console and log files

## Project Structure

- `index.js` - Main entry point that initializes the application and schedules periodic data fetching
- `dataParser.js` - Handles fetching and parsing GTFS data from the API
- `database.js` - Database connection and query functions
- `logger.js` - Logging configuration using Winston

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)

## Database Schema

The application uses a `vehicle_positions` table with the following structure:

- `id` - Serial primary key
- `vehicle_id` - Unique identifier for the vehicle
- `trip_id` - Trip identifier
- `route_id` - Route identifier
- `latitude` - Vehicle latitude
- `longitude` - Vehicle longitude
- `timestamp` - Time of the position report
- `congestion` - Traffic congestion level (if available)
- `stop_id` - ID of the nearest stop (if available)
- `status` - Vehicle status (e.g., "STOPPED_AT", "IN_TRANSIT_TO")
- `is_active` - Whether the vehicle is currently active
- `last_seen` - Timestamp of when the vehicle was last reported
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

## Logs

The application generates two log files:

- `combined.log` - All log messages
- `error.log` - Error messages only

## API Source

This project uses data from the Malaysian government's GTFS-realtime API:
https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-mrtfeeder
