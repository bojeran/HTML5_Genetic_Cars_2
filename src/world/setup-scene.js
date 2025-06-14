/* globals b2World b2Vec2 b2BodyDef b2FixtureDef b2PolygonShape */

var waterPhysics = require("./water-physics");
var logger = require("../logger/logger");

/*

world_def = {
  gravity: {x, y},
  doSleep: boolean,
  floorseed: string,
  tileDimensions,
  maxFloorTiles,
  mutable_floor: boolean,
  waterEnabled: boolean
}

*/

module.exports = function(world_def){

  var world = new b2World(world_def.gravity, world_def.doSleep);
  
  // Clear any existing water zones
  waterPhysics.clearWaterZones();
  
  var floorData = cw_createFloor(
    world,
    world_def.floorseed,
    world_def.tileDimensions,
    world_def.maxFloorTiles,
    world_def.mutable_floor,
    world_def.waterEnabled
  );

  var last_tile = floorData.floorTiles[
    floorData.floorTiles.length - 1
  ];
  var last_fixture = last_tile.GetFixtureList();
  var tile_position = last_tile.GetWorldPoint(
    last_fixture.GetShape().m_vertices[3]
  );
  world.finishLine = tile_position.x;
  
  logger.log(logger.LOG_LEVELS.INFO, "World setup complete - Finish line at X:", tile_position.x.toFixed(2), 
    "Floor tiles:", floorData.floorTiles.length, "Water zones:", floorData.waterZones.length);
  
  return {
    world: world,
    floorTiles: floorData.floorTiles,
    waterZones: floorData.waterZones,
    finishLine: tile_position.x
  };
}

function cw_createFloor(world, floorseed, dimensions, maxFloorTiles, mutable_floor, waterEnabled) {
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  var cw_floorTiles = [];
  var waterZones = [];
  var waterProbability = 0.15; // Reduced water probability to control track length
  var minDistanceBetweenWater = 10; // Increased minimum distance to spread water out
  var lastWaterIndex = -minDistanceBetweenWater;
  
  // Target the same track length whether water is enabled or not
  var targetTrackLength = maxFloorTiles * dimensions.x; // Expected track length without water
  var waterWidthBudget = 0; // Track how much extra length water adds
  
  Math.seedrandom(floorseed);
  
  // IMPORTANT: We must create exactly maxFloorTiles tiles AND maintain consistent track length
  var tilesCreated = 0;
  var segmentIndex = 0; // Track position for water placement decisions
  
  logger.log(logger.LOG_LEVELS.INFO, "Starting floor generation - maxFloorTiles:", maxFloorTiles, "waterEnabled:", waterEnabled, "target length:", targetTrackLength.toFixed(2));
  
  while (tilesCreated < maxFloorTiles) {
    // Check if we should create water here - with budget control
    var createWater = false;
    if (waterEnabled && segmentIndex > 15 && tilesCreated < maxFloorTiles - 30) { // Don't put water too early or late
      if (segmentIndex - lastWaterIndex >= minDistanceBetweenWater) {
        // Only create water if we haven't exceeded our track length budget
        var projectedExtraLength = waterWidthBudget + (2.5 * dimensions.x); // Estimate water width
        var remainingTiles = maxFloorTiles - tilesCreated;
        var projectedTotalLength = tile_position.x + (remainingTiles * dimensions.x) + projectedExtraLength;
        
        if (projectedTotalLength < targetTrackLength * 1.15) { // Allow 15% longer max
          createWater = Math.random() < waterProbability;
        }
      }
    }
    
    if (createWater) {
      // Create smaller water zones to control track length
      var waterWidth = 1.5 + Math.random() * 1.5; // 1.5-3 tiles wide (reduced)
      var waterDepth = 2.0 + Math.random() * 1.0; // 2-3 units deep
      var waterPhysicalWidth = waterWidth * dimensions.x;
      
      // Create water zone at current position
      var waterZone = waterPhysics.createWaterZone(
        world,
        new b2Vec2(tile_position.x, tile_position.y - 0.5), // Below ground level
        waterPhysicalWidth,
        waterDepth
      );
      waterZones.push(waterZone);
      
      logger.log(logger.LOG_LEVELS.INFO, "Created water zone at segment", segmentIndex, "width:", waterWidth.toFixed(2), "tiles");
      
      // Move position past the water and track the extra length
      tile_position.x += waterPhysicalWidth;
      waterWidthBudget += waterPhysicalWidth;
      lastWaterIndex = segmentIndex;
      
      // Increment segment index but NOT tile count (water doesn't create tiles)
      segmentIndex += Math.floor(waterWidth);
    } else {
      // Create normal floor tile
      // Use tilesCreated for consistent difficulty progression
      if (!mutable_floor) {
        // keep old impossible tracks if not using mutable floors
        last_tile = cw_createFloorTile(
          world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.5 * tilesCreated / maxFloorTiles
        );
      } else {
        // if path is mutable over races, create smoother tracks
        last_tile = cw_createFloorTile(
          world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.2 * tilesCreated / maxFloorTiles
        );
      }
      cw_floorTiles.push(last_tile);
      var last_fixture = last_tile.GetFixtureList();
      tile_position = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
      tilesCreated++;
      segmentIndex++;
    }
  }
  
  logger.log(logger.LOG_LEVELS.INFO, "Floor generation complete - Segments:", segmentIndex, "Tiles created:", tilesCreated, "Water zones:", waterZones.length);
  logger.log(logger.LOG_LEVELS.INFO, "Final position X:", tile_position.x.toFixed(2), "Target was:", targetTrackLength.toFixed(2), "Difference:", (tile_position.x - targetTrackLength).toFixed(2));
  
  return {
    floorTiles: cw_floorTiles,
    waterZones: waterZones
  };
}


function cw_createFloorTile(world, dim, position, angle) {
  var body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body = world.CreateBody(body_def);
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = new Array();
  coords.push(new b2Vec2(0, 0));
  coords.push(new b2Vec2(0, -dim.y));
  coords.push(new b2Vec2(dim.x, -dim.y));
  coords.push(new b2Vec2(dim.x, 0));

  var center = new b2Vec2(0, 0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  return coords.map(function(coord){
    return {
      x: Math.cos(angle) * (coord.x - center.x) - Math.sin(angle) * (coord.y - center.y) + center.x,
      y: Math.sin(angle) * (coord.x - center.x) + Math.cos(angle) * (coord.y - center.y) + center.y,
    };
  });
}
