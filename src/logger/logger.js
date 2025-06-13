var logger = {
  init: init,
  log: log,
  time: time,
  timeEnd: timeEnd,
  setLevel: setLevel,
  frameStart: frameStart,
  frameEnd: frameEnd,
  getStats: getStats,
  logHistoryString: logHistoryString
};

// Expose logger globally for console access
if (typeof window !== 'undefined') {
  window.gameLogger = logger;
  window.getGameLogs = function() {
    return {
      stats: getStats(),
      logLevels: LOG_LEVELS,
      currentLevel: currentLevel,
      recentFrameTimes: frameTimes.slice(-10),
      logHistory: logHistory.slice(-20), // Last 20 log messages
      waterLogs: logHistory.filter(log => log.message.toLowerCase().includes('water')),
      collisionLogs: logHistory.filter(log => log.message.toLowerCase().includes('collision')),
      logHistoryString: logHistoryString
    };
  };
}

module.exports = logger;

var LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

var currentLevel = LOG_LEVELS.INFO;
var frameCount = 0;
var frameStartTime = 0;
var frameTimes = [];
var maxFrameTimes = 100; // Keep last 100 frame times
var timers = {};
var logHistory = []; // Store recent log messages
var maxLogHistory = 100; // Keep last 100 log messages
var stats = {
  totalFrames: 0,
  avgFrameTime: 0,
  lastFrameTime: 0,
  collisionEvents: 0,
  waterForceApplications: 0,
  carsInWater: 0
};

function init(level) {
  currentLevel = level || LOG_LEVELS.INFO;
  frameCount = 0;
  stats = {
    totalFrames: 0,
    avgFrameTime: 0,
    lastFrameTime: 0,
    collisionEvents: 0,
    waterForceApplications: 0,
    carsInWater: 0
  };
  log(LOG_LEVELS.INFO, "Debug logger initialized at level:", Object.keys(LOG_LEVELS)[currentLevel]);
}

function log(level, ...args) {
  if (level <= currentLevel) {
    var prefix = "[" + Object.keys(LOG_LEVELS)[level] + "] Frame " + frameCount + ":";
    var message = prefix + " " + args.join(" ");
    
    // Store in history
    logHistory.push({
      level: level,
      frame: frameCount,
      message: args.join(" "),
      timestamp: Date.now()
    });
    
    // Keep history size manageable
    if (logHistory.length > maxLogHistory) {
      logHistory.shift();
    }
    
    console.log(prefix, ...args);
  }
}

function time(label) {
  timers[label] = performance.now();
}

function timeEnd(label) {
  if (timers[label]) {
    var elapsed = performance.now() - timers[label];
    log(LOG_LEVELS.DEBUG, "Timer", label + ":", elapsed.toFixed(2) + "ms");
    delete timers[label];
    return elapsed;
  }
  return 0;
}

function setLevel(level) {
  currentLevel = level;
  log(LOG_LEVELS.INFO, "Debug level changed to:", Object.keys(LOG_LEVELS)[level]);
}

function frameStart() {
  frameStartTime = performance.now();
  frameCount++;
  stats.totalFrames++;
  
  // Reset per-frame counters
  stats.collisionEvents = 0;
  stats.waterForceApplications = 0;
}

function frameEnd() {
  if (frameStartTime > 0) {
    var frameTime = performance.now() - frameStartTime;
    stats.lastFrameTime = frameTime;
    
    frameTimes.push(frameTime);
    if (frameTimes.length > maxFrameTimes) {
      frameTimes.shift();
    }
    
    // Calculate average
    var sum = frameTimes.reduce((a, b) => a + b, 0);
    stats.avgFrameTime = sum / frameTimes.length;
    
    // Log slow frames
    if (frameTime > 50) { // More than 50ms = less than 20fps
      log(LOG_LEVELS.WARN, "Slow frame detected:", frameTime.toFixed(2) + "ms");
    }
    
    // Log every 60 frames
    if (frameCount % 60 === 0) {
      log(LOG_LEVELS.DEBUG, "Frame stats - Avg:", stats.avgFrameTime.toFixed(2) + "ms", 
          "Last:", stats.lastFrameTime.toFixed(2) + "ms", 
          "Collisions:", stats.collisionEvents,
          "Water forces:", stats.waterForceApplications);
    }
  }
}

function getStats() {
  return Object.assign({}, stats);
}

// Global stats incrementers
function incrementCollisionEvents() {
  stats.collisionEvents++;
}

function incrementWaterForces() {
  stats.waterForceApplications++;
}

function setCarsInWater(count) {
  stats.carsInWater = count;
}

function logHistoryString(lines) {
  var numLines = lines || 20;
  var logs = logHistory.slice(-numLines);
  
  if (logs.length === 0) {
    return "No log messages available.";
  }
  
  var result = [];
  result.push("=== Game Log History (last " + logs.length + " messages) ===");
  
  logs.forEach(function(log) {
    var levelName = Object.keys(LOG_LEVELS)[log.level] || "UNKNOWN";
    var timestamp = new Date(log.timestamp).toLocaleTimeString();
    result.push("[" + levelName + "] Frame " + log.frame + " (" + timestamp + "): " + log.message);
  });
  
  result.push("=== End Log History ===");
  return result.join("\n");
}

// Export stats functions
module.exports.incrementCollisionEvents = incrementCollisionEvents;
module.exports.incrementWaterForces = incrementWaterForces;
module.exports.setCarsInWater = setCarsInWater;
module.exports.LOG_LEVELS = LOG_LEVELS;