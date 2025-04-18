require("dotenv").config();
const { fetchAndSaveData } = require("./dataParser");
const { logger } = require("./logger");
const { initDatabase, cleanupOldData } = require("./database");

// Interval in milliseconds
const VEHICLE_UPDATE_INTERVAL = 30000; // 30 seconds

// Function to schedule a task to run at a specific time each day
function scheduleDaily(taskFn, hour, minute) {
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0
  );

  // If the scheduled time is in the past for today, schedule it for tomorrow
  if (scheduledTime < now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const timeUntilExecution = scheduledTime - now;

  // Schedule the first execution
  setTimeout(() => {
    taskFn(); // Execute the task

    // Then schedule it to repeat every 24 hours
    setInterval(taskFn, 24 * 60 * 60 * 1000);
  }, timeUntilExecution);

  logger.info(`Scheduled daily task for ${scheduledTime.toLocaleTimeString()}`);
}

async function main() {
  try {
    // Initialize the database
    await initDatabase();

    // Initial data fetch
    await fetchAndSaveData();

    // Run data cleanup once at startup
    try {
      const deletedCount = await cleanupOldData();
      logger.info(`Initial cleanup removed ${deletedCount} old records`);
    } catch (error) {
      logger.error("Error in initial data cleanup:", error);
    }

    // Set up recurring vehicle position fetch
    setInterval(async () => {
      try {
        await fetchAndSaveData();
      } catch (error) {
        logger.error("Error in scheduled vehicle position fetch:", error);
      }
    }, VEHICLE_UPDATE_INTERVAL);

    // Schedule daily data cleanup at 12:05 AM
    scheduleDaily(
      async () => {
        try {
          const deletedCount = await cleanupOldData();
          logger.info(`Daily cleanup removed ${deletedCount} old records`);
        } catch (error) {
          logger.error("Error in scheduled data cleanup:", error);
        }
      },
      0,
      5
    ); // 0 hours (midnight), 5 minutes (12:05 AM)

    logger.info(
      `Parser started. Fetching vehicle positions every ${
        VEHICLE_UPDATE_INTERVAL / 1000
      } seconds`
    );
    logger.info("Daily data cleanup scheduled for 12:05 AM");
  } catch (error) {
    logger.error("Failed to initialize the application:", error);
    process.exit(1); // Exit if initialization fails
  }
}

main();
