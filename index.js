require("dotenv").config();
const http = require('http'); // <--- Import the http module
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

    // --- Create and start the HTTP server ---
    const server = http.createServer((req, res) => {
      // This function handles incoming requests
      // For now, just send a simple response
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Bus Tracker Hoster is running.\n');
    });

    server.listen(port, () => {
      logger.info(`Server listening on port ${port}`); // <--- Log that the server started
    });
    // --- End server creation ---

  } catch (error) {
    logger.error("Failed to initialize the application:", error);
    process.exit(1); // Exit if initialization fails
  }
}

main();