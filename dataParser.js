const axios = require("axios");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");
const { insertVehiclePositions } = require("./database");
const { logger } = require("./logger");

async function fetchAndSaveData() {
  try {
    logger.info("Fetching data from API...");

    // Fetch data from the API as binary data
    const response = await axios.get(process.env.API_URL, {
      responseType: "arraybuffer", // Important! Get the data as binary
      timeout: 10000, // 10 seconds timeout
    });

    if (!response.data) {
      logger.warn("No data received from API");
      return;
    }

    // Parse the binary GTFS-Realtime data
    const vehiclesData = parseGtfsData(response.data);

    if (vehiclesData.length === 0) {
      logger.warn("No vehicle positions found in the API response");
      return;
    }

    // Save data to database
    await insertVehiclePositions(vehiclesData);

    logger.info(
      `Successfully processed ${vehiclesData.length} vehicle positions`
    );
  } catch (error) {
    logger.error("Error fetching or processing data:", error);
    throw error;
  }
}

function parseGtfsData(binaryData) {
  try {
    // Parse the binary GTFS data using the protocol buffer bindings
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(binaryData)
    );

    // Extract vehicle positions from the feed
    const vehiclesData = [];
    let skippedCount = 0;

    feed.entity.forEach((entity) => {
      if (entity.vehicle && entity.vehicle.position) {
        const {
          vehicle,
          position,
          trip,
          timestamp,
          currentStatus,
          stopId,
          congestionLevel,
        } = entity.vehicle;
        const currentTime = new Date();

        // Fix timestamp handling - handle cases where timestamp might be too large
        let formattedTimestamp;
        try {
          // Check if timestamp is a valid value
          if (timestamp && Number(timestamp) > 0) {
            const timestampNum = Number(timestamp);
            // If timestamp is in seconds (Unix epoch), convert to milliseconds
            const timestampMs =
              timestampNum < 10000000000 ? timestampNum * 1000 : timestampNum;

            // Check if timestamp is in a reasonable range (between 2000 and 2050)
            const year = new Date(timestampMs).getFullYear();
            if (year >= 2000 && year <= 2050) {
              formattedTimestamp = new Date(timestampMs);
            } else {
              formattedTimestamp = currentTime;
              logger.warn(
                `Invalid timestamp value detected: ${timestamp}, using current time instead`
              );
            }
          } else {
            formattedTimestamp = currentTime;
          }
        } catch (err) {
          logger.warn(
            `Error processing timestamp value: ${timestamp}, using current time instead`
          );
          formattedTimestamp = currentTime;
        }

        // Skip entries with missing required fields
        if (!position?.latitude || !position?.longitude) {
          skippedCount++;
          return; // Skip this entity
        }

        // Skip entries with null vehicle_id
        if (!vehicle?.id) {
          skippedCount++;
          return; // Skip this entity
        }

        // Ensure non-null values for required fields using default values
        const vehicleData = {
          trip_id: trip?.tripId || "unknown",
          route_id: trip?.routeId || "unknown",
          vehicle_id: vehicle.id,
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: formattedTimestamp,
          congestion: congestionLevel
            ? congestionLevelToString(congestionLevel)
            : null,
          stop_id: stopId || null,
          status: currentStatus ? vehicleStatusToString(currentStatus) : null,
          is_active: true,
          last_seen: currentTime,
        };

        vehiclesData.push(vehicleData);
      } else {
        skippedCount++;
      }
    });

    if (skippedCount > 0) {
      logger.info(
        `Skipped ${skippedCount} vehicle entries with missing required data`
      );
    }

    logger.info(
      `Parsed ${vehiclesData.length} valid vehicle positions from GTFS data`
    );
    return vehiclesData;
  } catch (error) {
    logger.error("Error parsing GTFS data:", error);
    return [];
  }
}

// Helper function to convert congestion level codes to string representations
function congestionLevelToString(congestionLevel) {
  const levels = {
    0: "UNKNOWN_CONGESTION_LEVEL",
    1: "RUNNING_SMOOTHLY",
    2: "STOP_AND_GO",
    3: "CONGESTION",
    4: "SEVERE_CONGESTION",
  };
  return levels[congestionLevel] || "UNKNOWN";
}

// Helper function to convert vehicle status codes to string representations
function vehicleStatusToString(status) {
  const statuses = {
    0: "INCOMING_AT",
    1: "STOPPED_AT",
    2: "IN_TRANSIT_TO",
  };
  return statuses[status] || "UNKNOWN";
}

// Keep the old JSON parsing function just in case, but it's not used now
function parseVehicleData(data) {
  try {
    // Check if data is already an object (parsed JSON)
    const entities = Array.isArray(data)
      ? data
      : typeof data === "string"
      ? JSON.parse(data)
      : data;

    // Extract vehicle positions from the data
    const vehiclesData = [];

    // Process each entity in the feed
    if (Array.isArray(entities)) {
      entities.forEach((entity) => {
        if (entity && entity.vehicle) {
          const { vehicle, position, trip } = entity.vehicle;

          if (position) {
            vehiclesData.push({
              vehicle_id: vehicle?.id || null,
              route_id: trip?.routeId || null,
              trip_id: trip?.tripId || null,
              latitude: position.latitude || null,
              longitude: position.longitude || null,
              bearing: position.bearing || null,
              speed: position.speed || null,
              timestamp:
                entity.vehicle.timestamp || Math.floor(Date.now() / 1000),
            });
          }
        }
      });
    }

    return vehiclesData;
  } catch (error) {
    logger.error("Error parsing vehicle data:", error);
    return [];
  }
}

module.exports = {
  fetchAndSaveData,
};
