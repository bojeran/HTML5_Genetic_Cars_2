/* globals b2World b2Vec2 b2BodyDef b2FixtureDef b2PolygonShape */

var waterPhysics = require("./water-physics");

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
  var waterProbability = 0.25; // 25% chance of water per segment
  var minDistanceBetweenWater = 8; // Minimum tiles between water zones
  var lastWaterIndex = -minDistanceBetweenWater;
  
  Math.seedrandom(floorseed);
  
  var k = 0;
  while (k < maxFloorTiles) {
    // Check if we should create water here
    var createWater = false;
    if (waterEnabled && k > 10 && k < maxFloorTiles - 20) { // Don't put water too early or late
      if (k - lastWaterIndex >= minDistanceBetweenWater) {
        createWater = Math.random() < waterProbability;
      }
    }
    
    if (createWater) {
      // Create a gap for water
      var waterWidth = 2 + Math.random() * 2; // 2-4 tiles wide
      var waterDepth = 2.5 + Math.random() * 1.0; // 2.5-3.5 units deep
      
      // Ensure we don't exceed maxFloorTiles
      var tilesForWater = Math.floor(waterWidth);
      if (k + tilesForWater >= maxFloorTiles) {
        createWater = false;
      }
    }
    
    if (createWater) {
      // Create water zone at current position
      var waterZone = waterPhysics.createWaterZone(
        world,
        new b2Vec2(tile_position.x, tile_position.y - 0.5), // Below ground level
        waterWidth * dimensions.x,
        waterDepth
      );
      waterZones.push(waterZone);
      
      // Move position past the water
      tile_position.x += waterWidth * dimensions.x;
      lastWaterIndex = k;
      
      // Skip tiles to account for water width
      k += tilesForWater;
    } else {
      // Create normal floor tile
      if (!mutable_floor) {
        // keep old impossible tracks if not using mutable floors
        last_tile = cw_createFloorTile(
          world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.5 * k / maxFloorTiles
        );
      } else {
        // if path is mutable over races, create smoother tracks
        last_tile = cw_createFloorTile(
          world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.2 * k / maxFloorTiles
        );
      }
      cw_floorTiles.push(last_tile);
      var last_fixture = last_tile.GetFixtureList();
      tile_position = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
      k++;
    }
  }
  
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
