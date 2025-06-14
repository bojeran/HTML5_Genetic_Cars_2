var cw_drawVirtualPoly = require("./draw-virtual-poly");
var logger = require("../logger/logger");

var lastLoggedTileCount = -1;
var framesSinceLastLog = 0;

module.exports = function(ctx, camera, cw_floorTiles) {
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#777";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();

  var k;
  if(camera.pos.x - 10 > 0){
    k = Math.floor((camera.pos.x - 10) / 1.5);
  } else {
    k = 0;
  }

  // Log every 60 frames or when tile count changes
  framesSinceLastLog++;
  if (framesSinceLastLog > 60 || lastLoggedTileCount !== cw_floorTiles.length) {
    logger.log(logger.LOG_LEVELS.DEBUG, "Floor rendering - Camera X:", camera_x.toFixed(2), 
      "Starting tile index:", k, "Total tiles:", cw_floorTiles.length);
    lastLoggedTileCount = cw_floorTiles.length;
    framesSinceLastLog = 0;
  }

  var tilesRendered = 0;
  var lastTilePosition = 0;

  outer_loop:
    for (k; k < cw_floorTiles.length; k++) {
      var b = cw_floorTiles[k];
      for (var f = b.GetFixtureList(); f; f = f.m_next) {
        var s = f.GetShape();
        var shapePosition = b.GetWorldPoint(s.m_vertices[0]).x;
        lastTilePosition = shapePosition;
        if ((shapePosition > (camera_x - 5)) && (shapePosition < (camera_x + 10))) {
          cw_drawVirtualPoly(ctx, b, s.m_vertices, s.m_vertexCount);
          tilesRendered++;
        }
        if (shapePosition > camera_x + 10) {
          break outer_loop;
        }
      }
    }
    
  // Log when approaching end of tiles
  if (k >= cw_floorTiles.length - 10) {
    logger.log(logger.LOG_LEVELS.INFO, "Approaching end of floor tiles! Camera X:", camera_x.toFixed(2), 
      "Last tile index:", k, "Last tile X:", lastTilePosition.toFixed(2));
  }
  ctx.fill();
  ctx.stroke();
}
