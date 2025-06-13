# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTML5 Genetic Cars is a genetic algorithm car evolver implemented in HTML5 canvas. It uses Box2D physics engine to evolve random two-wheeled shapes into cars over generations.

## Build Commands

- **Build main application**: `npm run build` (builds both main and graph bundles)
- **Build main bundle only**: `npm run build-main` (creates bundle.js)
- **Build graph bundle only**: `npm run build-graph` (creates bundle-bare.js)
- **Watch for changes**: `npm run watch` (auto-rebuilds on file changes)
- **Install dependencies**: `npm install`

## Architecture

The codebase follows a modular architecture with clear separation of concerns:

### Core Systems

1. **Genetic Algorithm** (`src/machine-learning/genetic-algorithm/`)
   - Manages generations, mutations, and selection
   - Key configuration in `src/generation-config/`
   - Mutation rate, mutation size, and elite clones configurable via UI

2. **Physics Simulation** (`src/world/`)
   - Uses Box2D physics engine
   - Handles world setup, car physics, and collision detection
   - Configurable gravity and floor mutability

3. **Car Schema** (`src/car-schema/`)
   - Defines car genome structure (shape vertices, wheel size/position/density, chassis density)
   - Handles car construction from genetic data
   - Manages car lifecycle and scoring

4. **Rendering System** (`src/draw/`)
   - Canvas-based rendering with camera system
   - Minimap visualization
   - Ghost replay functionality for top performers
   - Performance graphs tracking generation progress

5. **Ghost System** (`src/ghost/`)
   - Records and replays top-performing cars
   - Allows comparison between generations

### Entry Points

- `src/index.js` - Main application with full UI
- `src/bare.js` - Simplified version for graph display
- `index.html` - Main application page
- `graphs.html` - Graph visualization page

### Key Dependencies

- `box2d.js` - Physics engine
- `seedrandom.js` - Deterministic random number generation
- `mersenne-twister` - Random number generation for genetic algorithm
- `browserify` - Module bundler

## Development Notes

- The simulation runs at 60 FPS for both physics (box2dfps) and rendering (screenfps)
- Car health determines lifespan (default: 10 seconds at 60fps)
- Generations progress automatically when all cars die
- Seeds can be used to create reproducible tracks for competition

## Debugging and Logging System

The project includes a centralized logging system (`src/debug/logger.js`) that captures all game events, physics interactions, and performance data.

### Accessing Logs in Browser Console

1. **Open Chrome DevTools**: Press `F12` or right-click → "Inspect" → "Console" tab
2. **Use Global Functions**: The logging system exposes these functions:

```javascript
// Get all recent logs
getGameLogs()

// Get only water-related events
getGameLogs().waterLogs

// Get collision detection events  
getGameLogs().collisionLogs

// Get performance statistics
getGameLogs().stats

// Get recent frame timing data
getGameLogs().recentFrameTimes

// Get formatted log history string (AI-friendly format)
gameLogger.logHistoryString(20)  // Get last 20 log messages
getGameLogs().logHistoryString(10)  // Alternative access method

// Access logger directly
gameLogger.setLevel(gameLogger.LOG_LEVELS.DEBUG)  // Show debug messages
gameLogger.setLevel(gameLogger.LOG_LEVELS.INFO)   // Show info and above (default)
```

### Log Levels

- **ERROR (0)**: Critical errors that break functionality
- **WARN (1)**: Warning messages about unusual conditions
- **INFO (2)**: General information about game state (default level)
- **DEBUG (3)**: Detailed debugging information

### Key Events Logged

- Car collision detection (water, floor, obstacles)
- Water physics force application (drag, buoyancy)
- Generation transitions and car deaths
- Performance metrics (frame timing, slow frames)
- Car construction and physics setup

### Water Physics Debugging

Water physics events are specifically tracked and can be filtered:
```javascript
// Monitor water interactions in real-time
setInterval(() => {
    const logs = getGameLogs();
    if (logs.waterLogs.length > 0) {
        console.log("Recent water events:", logs.waterLogs.slice(-5));
    }
}, 3000);
```

### Performance Monitoring

Frame timing and performance data:
```javascript
// Check simulation performance
const stats = getGameLogs().stats;
console.log(`Avg frame time: ${stats.avgFrameTime.toFixed(2)}ms`);
console.log(`Cars in water: ${stats.carsInWater}`);
console.log(`Collision events: ${stats.collisionEvents}`);
```

### AI-Friendly Log History

The `logHistoryString` method provides formatted log output optimized for AI analysis:

```javascript
// Get formatted log history (default: 20 messages)
gameLogger.logHistoryString()

// Get specific number of recent messages
gameLogger.logHistoryString(10)

// Alternative access via getGameLogs
getGameLogs().logHistoryString(15)
```

**Output format:**
```
=== Game Log History (last N messages) ===
[LEVEL] Frame XXX (HH:MM:SS): Message content
[INFO] Frame 657 (17:07:17): Car 2 chassis entered water
[WARN] Frame 720 (17:07:18): Slow frame detected: 52.30ms
=== End Log History ===
```

### Code Standards

- **Never use `console.log` directly** - Always use the logger system
- **Use appropriate log levels** - DEBUG for detailed info, INFO for general events
- **Include relevant context** - Car indices, frame numbers, values

## Project Testing

- To test run this project you have to start a local webserver and then use the puppeteer mcp to visit localhost:8000 where the project is running.
- **When using Puppeteer MCP for log analysis**: Use `gameLogger.logHistoryString(lines)` method via `puppeteer_evaluate` to get AI-friendly formatted log output instead of raw log objects.

## Puppeteer Guidelines

- When using puppeteer:puppeteer_navigate always start with the viewport size 1920x1080.