require("dotenv").config();
const { fetchAndSaveData } = require("./dataParser");
const { logger } = require("./logger");
const { initDatabase } = require("./database");
const port = process.env.PORT || 4000;

// Interval in milliseconds (30 seconds = 30000ms)
const INTERVAL = 30000;

async function main() {
  try {
    // Initialize the database
    await initDatabase();

    // Initial data fetch
    await fetchAndSaveData();

    // Set up the recurring fetch
    setInterval(async () => {
      try {
        await fetchAndSaveData();
      } catch (error) {
        logger.error("Error in scheduled data fetch:", error);
      }
    }, INTERVAL);

    logger.info(
      `Parser started. Fetching data every ${INTERVAL / 1000} seconds`
    );
  } catch (error) {
    logger.error("Failed to initialize the application:", error);
    process.exit(1);
  }
}

main();
