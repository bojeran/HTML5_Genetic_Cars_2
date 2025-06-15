/* Debug entry point for main application */
var logger = require("./logger/logger.js");

// Set debug level before any other code runs
logger.setInitialLevel(logger.LOG_LEVELS.DEBUG);

// Now require the main application
require("./index.js");