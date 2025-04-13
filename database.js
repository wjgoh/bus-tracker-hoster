const { Pool } = require("pg");
const { logger } = require("./logger");

// Create a new Pool instance with connection string from environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to initialize the database and create table if it doesn't exist
async function initDatabase() {
  const client = await pool.connect();
  try {
    logger.info("Creating vehicle_positions table if it doesn't exist");
    await client.query(`
        CREATE TABLE IF NOT EXISTS vehicle_positions (
          id SERIAL PRIMARY KEY,
          vehicle_id TEXT UNIQUE NOT NULL,
          trip_id TEXT NOT NULL,
          route_id TEXT NOT NULL,
          latitude NUMERIC(10, 7) NOT NULL,  -- Changed to numeric for better precision
          longitude NUMERIC(10, 7) NOT NULL,  -- Changed to numeric for better precision
          timestamp TIMESTAMPTZ NOT NULL,
          congestion TEXT,
          stop_id TEXT,
          status TEXT,
          is_active BOOLEAN DEFAULT true,
          last_seen TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    logger.info("Database initialized successfully");
  } catch (error) {
    logger.error("Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to insert or update vehicle position data
async function insertVehiclePosition(vehicleData) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO vehicle_positions 
        (trip_id, route_id, vehicle_id, latitude, longitude, timestamp,
         congestion, stop_id, status, is_active, last_seen)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (vehicle_id) 
      DO UPDATE SET
        trip_id = $1,
        route_id = $2,
        latitude = $4,
        longitude = $5,
        timestamp = $6,
        congestion = $7,
        stop_id = $8,
        status = $9,
        is_active = $10,
        last_seen = $11,
        updated_at = NOW()
    `;
    await client.query(query, [
      vehicleData.trip_id,
      vehicleData.route_id,
      vehicleData.vehicle_id,
      vehicleData.latitude,
      vehicleData.longitude,
      vehicleData.timestamp,
      vehicleData.congestion || null,
      vehicleData.stop_id || null,
      vehicleData.status || null,
      vehicleData.is_active !== undefined ? vehicleData.is_active : true,
      vehicleData.last_seen || new Date(),
    ]);
  } catch (error) {
    logger.error("Error inserting/updating vehicle position:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to mark vehicles as inactive if they're not in the current set
async function markMissingVehiclesInactive(activeVehicleIds) {
  if (!activeVehicleIds || activeVehicleIds.length === 0) {
    logger.warn(
      "No active vehicle IDs provided, skipping inactive status update"
    );
    return;
  }

  const client = await pool.connect();
  try {
    const placeholders = activeVehicleIds
      .map((_, idx) => `$${idx + 1}`)
      .join(",");
    const query = `
      UPDATE vehicle_positions 
      SET is_active = false, updated_at = NOW()
      WHERE is_active = true AND vehicle_id NOT IN (${placeholders})
    `;
    const result = await client.query(query, activeVehicleIds);
    logger.info(`Marked ${result.rowCount} vehicles as inactive`);
  } catch (error) {
    logger.error("Error marking inactive vehicles:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to insert/update multiple vehicle positions in a transaction
async function insertVehiclePositions(vehiclesData) {
  const client = await pool.connect();
  try {
    // Extract all valid vehicle IDs from the current data
    const activeVehicleIds = vehiclesData
      .filter((vehicle) => vehicle.vehicle_id)
      .map((vehicle) => vehicle.vehicle_id);

    await client.query("BEGIN");

    for (const vehicle of vehiclesData) {
      // Skip vehicles without IDs
      if (!vehicle.vehicle_id) {
        logger.warn("Skipping vehicle record with no ID");
        continue;
      }

      const query = `
        INSERT INTO vehicle_positions 
          (trip_id, route_id, vehicle_id, latitude, longitude, timestamp,
           congestion, stop_id, status, is_active, last_seen)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (vehicle_id) 
        DO UPDATE SET
          trip_id = $1,
          route_id = $2,
          latitude = $4,
          longitude = $5,
          timestamp = $6,
          congestion = $7,
          stop_id = $8,
          status = $9,
          is_active = true, -- Always set to active when present in API results
          last_seen = $11,
          updated_at = NOW()
      `;
      await client.query(query, [
        vehicle.trip_id,
        vehicle.route_id,
        vehicle.vehicle_id,
        vehicle.latitude,
        vehicle.longitude,
        vehicle.timestamp,
        vehicle.congestion || null,
        vehicle.stop_id || null,
        vehicle.status || null,
        true, // Always true for newly inserted records
        vehicle.last_seen || new Date(),
      ]);
    }

    await client.query("COMMIT");
    logger.info(
      `Updated/inserted ${vehiclesData.length} vehicle position records`
    );

    // After transaction completes successfully, mark missing vehicles as inactive
    await markMissingVehiclesInactive(activeVehicleIds);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error inserting multiple vehicle positions:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDatabase,
  insertVehiclePosition,
  insertVehiclePositions,
};
