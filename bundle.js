(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports={
  "wheelCount": 2,
  "wheelMinRadius": 0.2,
  "wheelRadiusRange": 0.5,
  "wheelMinDensity": 40,
  "wheelDensityRange": 100,
  "chassisDensityRange": 300,
  "chassisMinDensity": 30,
  "chassisMinAxis": 0.1,
  "chassisAxisRange": 1.1
}

},{}],2:[function(require,module,exports){
var carConstants = require("./car-constants.json");

module.exports = {
  worldDef: worldDef,
  carConstants: getCarConstants,
  generateSchema: generateSchema
}

function worldDef(){
  var box2dfps = 60;
  return {
    gravity: { y: 0 },
    doSleep: true,
    floorseed: "abc",
    maxFloorTiles: 200,
    mutable_floor: false,
    motorSpeed: 20,
    box2dfps: box2dfps,
    max_car_health: box2dfps * 10,
    tileDimensions: {
      width: 1.5,
      height: 0.15
    }
  };
}

function getCarConstants(){
  return carConstants;
}

function generateSchema(values){
  return {
    wheel_radius: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinRadius,
      range: values.wheelRadiusRange,
      factor: 1,
    },
    wheel_density: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinDensity,
      range: values.wheelDensityRange,
      factor: 1,
    },
    chassis_density: {
      type: "float",
      length: 1,
      min: values.chassisDensityRange,
      range: values.chassisMinDensity,
      factor: 1,
    },
    vertex_list: {
      type: "float",
      length: 12,
      min: values.chassisMinAxis,
      range: values.chassisAxisRange,
      factor: 1,
    },
    wheel_vertex: {
      type: "shuffle",
      length: 8,
      limit: values.wheelCount,
      factor: 1,
    },
  };
}

},{"./car-constants.json":1}],3:[function(require,module,exports){
/*
  globals b2RevoluteJointDef b2Vec2 b2BodyDef b2Body b2FixtureDef b2PolygonShape b2CircleShape
*/

var createInstance = require("../machine-learning/create-instance");
var logger = require("../logger/logger");

module.exports = defToCar;

function defToCar(normal_def, world, constants){
  logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: Starting car construction");
  var car_def = createInstance.applyTypes(constants.schema, normal_def)
  logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: Car def created, wheel count:", car_def.wheel_radius.length);
  
  var instance = {};
  instance.chassis = createChassis(
    world, car_def.vertex_list, car_def.chassis_density
  );
  logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: Chassis created");
  var i;

  var wheelCount = car_def.wheel_radius.length;

  instance.wheels = [];
  for (i = 0; i < wheelCount; i++) {
    logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: Creating wheel", i);
    instance.wheels[i] = createWheel(
      world,
      car_def.wheel_radius[i],
      car_def.wheel_density[i]
    );
  }
  logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: All", wheelCount, "wheels created");

  var carmass = instance.chassis.GetMass();
  for (i = 0; i < wheelCount; i++) {
    carmass += instance.wheels[i].GetMass();
  }

  var joint_def = new b2RevoluteJointDef();
  logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: Creating wheel joints");

  for (i = 0; i < wheelCount; i++) {
    logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: Creating joint for wheel", i);
    var torque = carmass * -constants.gravity.y / car_def.wheel_radius[i];

    logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: wheel_vertex[" + i + "] =", car_def.wheel_vertex[i]);
    if (car_def.wheel_vertex[i] >= instance.chassis.vertex_list.length) {
      logger.log(logger.LOG_LEVELS.ERROR, "ERROR: wheel_vertex index out of bounds!", car_def.wheel_vertex[i], ">=", instance.chassis.vertex_list.length);
    }
    
    var randvertex = instance.chassis.vertex_list[car_def.wheel_vertex[i]];
    joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
    joint_def.localAnchorB.Set(0, 0);
    joint_def.maxMotorTorque = torque;
    joint_def.motorSpeed = -constants.motorSpeed;
    joint_def.enableMotor = true;
    joint_def.bodyA = instance.chassis;
    joint_def.bodyB = instance.wheels[i];
    world.CreateJoint(joint_def);
    logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: Joint created for wheel", i);
  }
  logger.log(logger.LOG_LEVELS.DEBUG, "defToCar: All joints created");

  return instance;
}

function createChassis(world, vertexs, density) {

  var vertex_list = new Array();
  vertex_list.push(new b2Vec2(vertexs[0], 0));
  vertex_list.push(new b2Vec2(vertexs[1], vertexs[2]));
  vertex_list.push(new b2Vec2(0, vertexs[3]));
  vertex_list.push(new b2Vec2(-vertexs[4], vertexs[5]));
  vertex_list.push(new b2Vec2(-vertexs[6], 0));
  vertex_list.push(new b2Vec2(-vertexs[7], -vertexs[8]));
  vertex_list.push(new b2Vec2(0, -vertexs[9]));
  vertex_list.push(new b2Vec2(vertexs[10], -vertexs[11]));

  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0.0, 4.0);

  var body = world.CreateBody(body_def);

  createChassisPart(body, vertex_list[0], vertex_list[1], density);
  createChassisPart(body, vertex_list[1], vertex_list[2], density);
  createChassisPart(body, vertex_list[2], vertex_list[3], density);
  createChassisPart(body, vertex_list[3], vertex_list[4], density);
  createChassisPart(body, vertex_list[4], vertex_list[5], density);
  createChassisPart(body, vertex_list[5], vertex_list[6], density);
  createChassisPart(body, vertex_list[6], vertex_list[7], density);
  createChassisPart(body, vertex_list[7], vertex_list[0], density);

  body.vertex_list = vertex_list;

  return body;
}


function createChassisPart(body, vertex1, vertex2, density) {
  var vertex_list = new Array();
  vertex_list.push(vertex1);
  vertex_list.push(vertex2);
  vertex_list.push(b2Vec2.Make(0, 0));
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.density = density;
  fix_def.friction = 10;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;
  fix_def.shape.SetAsArray(vertex_list, 3);

  body.CreateFixture(fix_def);
}

function createWheel(world, radius, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0, 0);

  var body = world.CreateBody(body_def);

  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2CircleShape(radius);
  fix_def.density = density;
  fix_def.friction = 1;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;

  body.CreateFixture(fix_def);
  return body;
}

},{"../logger/logger":22,"../machine-learning/create-instance":23}],4:[function(require,module,exports){
var waterPhysics = require("../world/water-physics");

module.exports = {
  getInitialState: getInitialState,
  updateState: updateState,
  getStatus: getStatus,
  calculateScore: calculateScore,
};

function getInitialState(world_def){
  return {
    frames: 0,
    health: world_def.max_car_health,
    maxPositiony: 0,
    minPositiony: 0,
    maxPositionx: 0,
    framesInWater: 0,
  };
}

function updateState(constants, worldConstruct, state){
  if(state.health <= 0){
    throw new Error("Already Dead");
  }
  if(state.maxPositionx > constants.finishLine){
    throw new Error("already Finished");
  }

  // console.log(state);
  // check health
  var position = worldConstruct.chassis.GetPosition();
  // check if car reached end of the path
  var nextState = {
    frames: state.frames + 1,
    maxPositionx: position.x > state.maxPositionx ? position.x : state.maxPositionx,
    maxPositiony: position.y > state.maxPositiony ? position.y : state.maxPositiony,
    minPositiony: position.y < state.minPositiony ? position.y : state.minPositiony
  };

  if (position.x > constants.finishLine) {
    return nextState;
  }

  if (position.x > state.maxPositionx + 0.02) {
    nextState.health = constants.max_car_health;
    nextState.framesInWater = 0;
    return nextState;
  }
  
  // Check if car is in water
  var carIndex = worldConstruct.carIndex || 0; // Need to pass car index from world/run.js
  var isInWater = waterPhysics.isInWater(carIndex);
  
  if (isInWater) {
    nextState.framesInWater = state.framesInWater + 1;
    // Lose health slightly faster in water, but not too much
    nextState.health = state.health - 2; // Reduced from -3 to -2
    
    // Extra penalty for being stuck in water too long (but only after longer time)
    if (nextState.framesInWater > 180) { // More than 3 seconds at 60fps (was 1 second)
      nextState.health -= 1; // Reduced from -2 to -1
    }
  } else {
    nextState.framesInWater = 0;
    nextState.health = state.health - 1;
  }
  
  if (Math.abs(worldConstruct.chassis.GetLinearVelocity().x) < 0.001) {
    nextState.health -= 5;
  }
  return nextState;
}

function getStatus(state, constants){
  if(hasFailed(state, constants)) return -1;
  if(hasSuccess(state, constants)) return 1;
  return 0;
}

function hasFailed(state /*, constants */){
  return state.health <= 0;
}
function hasSuccess(state, constants){
  return state.maxPositionx > constants.finishLine;
}

function calculateScore(state, constants){
  var avgspeed = (state.maxPositionx / state.frames) * constants.box2dfps;
  var position = state.maxPositionx;
  var score = position + avgspeed;
  
  // Bonus for successfully crossing water (spent time in water but didn't die)
  if (state.framesInWater > 0 && state.health > 0) {
    score += 5; // Small bonus for water survival
  }
  
  return {
    v: score,
    s: avgspeed,
    x: position,
    y: state.maxPositiony,
    y2: state.minPositiony
  }
}

},{"../world/water-physics":28}],5:[function(require,module,exports){
/* globals document */

var run = require("../car-schema/run");

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function () {
  this.__constructor.apply(this, arguments);
}

cw_Car.prototype.__constructor = function (car) {
  this.car = car;
  this.car_def = car.def;
  var car_def = this.car_def;

  this.frames = 0;
  this.alive = true;
  this.is_elite = car.def.is_elite;
  this.healthBar = document.getElementById("health" + car_def.index).style;
  this.healthBarText = document.getElementById("health" + car_def.index).nextSibling.nextSibling;
  this.healthBarText.innerHTML = car_def.index;
  this.minimapmarker = document.getElementById("bar" + car_def.index);

  if (this.is_elite) {
    this.healthBar.backgroundColor = "#3F72AF";
    this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
    this.minimapmarker.innerHTML = car_def.index;
  } else {
    this.healthBar.backgroundColor = "#F7C873";
    this.minimapmarker.style.borderLeft = "1px solid #F7C873";
    this.minimapmarker.innerHTML = car_def.index;
  }

}

cw_Car.prototype.getPosition = function () {
  return this.car.car.chassis.GetPosition();
}

cw_Car.prototype.kill = function (currentRunner, constants) {
  this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
  var finishLine = currentRunner.scene.finishLine
  var max_car_health = constants.max_car_health;
  var status = run.getStatus(this.car.state, {
    finishLine: finishLine,
    max_car_health: max_car_health,
  })
  switch(status){
    case 1: {
      this.healthBar.width = "0";
      break
    }
    case -1: {
      this.healthBarText.innerHTML = "&dagger;";
      this.healthBar.width = "0";
      break
    }
  }
  this.alive = false;

}

module.exports = cw_Car;

},{"../car-schema/run":4}],6:[function(require,module,exports){

var cw_drawVirtualPoly = require("./draw-virtual-poly");
var cw_drawCircle = require("./draw-circle");

module.exports = function(car_constants, myCar, camera, ctx){
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;

  var wheelMinDensity = car_constants.wheelMinDensity
  var wheelDensityRange = car_constants.wheelDensityRange

  if (!myCar.alive) {
    return;
  }
  var myCarPos = myCar.getPosition();

  if (myCarPos.x < (camera_x - 5)) {
    // too far behind, don't draw
    return;
  }

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1 / zoom;

  var wheels = myCar.car.car.wheels;

  for (var i = 0; i < wheels.length; i++) {
    var b = wheels[i];
    for (var f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var color = Math.round(255 - (255 * (f.m_density - wheelMinDensity)) / wheelDensityRange).toString();
      var rgbcolor = "rgb(" + color + "," + color + "," + color + ")";
      cw_drawCircle(ctx, b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
    }
  }

  if (myCar.is_elite) {
    ctx.strokeStyle = "#3F72AF";
    ctx.fillStyle = "#DBE2EF";
  } else {
    ctx.strokeStyle = "#F7C873";
    ctx.fillStyle = "#FAEBCD";
  }
  ctx.beginPath();

  var chassis = myCar.car.car.chassis;

  for (f = chassis.GetFixtureList(); f; f = f.m_next) {
    var cs = f.GetShape();
    cw_drawVirtualPoly(ctx, chassis, cs.m_vertices, cs.m_vertexCount);
  }
  ctx.fill();
  ctx.stroke();
}

},{"./draw-circle":7,"./draw-virtual-poly":9}],7:[function(require,module,exports){

module.exports = cw_drawCircle;

function cw_drawCircle(ctx, body, center, radius, angle, color) {
  var p = body.GetWorldPoint(center);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + radius * Math.cos(angle), p.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{}],8:[function(require,module,exports){
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

},{"../logger/logger":22,"./draw-virtual-poly":9}],9:[function(require,module,exports){


module.exports = function(ctx, body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  // call beginPath before call

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    var p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);
}

},{}],10:[function(require,module,exports){
module.exports = function(ctx, camera, waterZones) {
  if (!waterZones || waterZones.length === 0) return;
  
  var camera_x = camera.pos.x;
  var camera_y = camera.pos.y;
  var zoom = camera.zoom;
  
  ctx.save();
  
  // Set water style
  ctx.fillStyle = "rgba(64, 164, 223, 0.6)"; // Semi-transparent blue
  ctx.strokeStyle = "rgba(32, 132, 191, 0.8)"; // Darker blue for edges
  ctx.lineWidth = 2 / zoom;
  
  // Wave animation based on time
  var waveOffset = Date.now() * 0.001; // Slow wave animation
  
  for (var i = 0; i < waterZones.length; i++) {
    var water = waterZones[i];
    var waterX = water.position.x;
    var waterY = water.position.y;
    
    // Only draw if water is visible on screen
    if (waterX + water.width < camera_x - 10 || waterX > camera_x + 20) {
      continue;
    }
    
    ctx.beginPath();
    
    // Draw water with wave effect on top
    ctx.moveTo(waterX, waterY);
    
    // Create wave pattern along the top
    var waveSegments = Math.ceil(water.width / 0.5);
    for (var j = 0; j <= waveSegments; j++) {
      var x = waterX + (j / waveSegments) * water.width;
      var waveHeight = Math.sin((j * 0.5 + waveOffset) * 2) * 0.1;
      ctx.lineTo(x, waterY + waveHeight);
    }
    
    // Complete the water rectangle
    ctx.lineTo(waterX + water.width, waterY - water.depth);
    ctx.lineTo(waterX, waterY - water.depth);
    ctx.closePath();
    
    // Fill and stroke
    ctx.fill();
    ctx.stroke();
    
    // Add some surface ripples
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1 / zoom;
    
    for (var k = 0; k < 3; k++) {
      var rippleX = waterX + water.width * (0.2 + k * 0.3);
      var rippleOffset = Math.sin((waveOffset + k) * 3) * 0.05;
      
      ctx.beginPath();
      ctx.moveTo(rippleX - 0.2, waterY + rippleOffset);
      ctx.lineTo(rippleX + 0.2, waterY + rippleOffset);
      ctx.stroke();
    }
    
    // Draw walls and floor
    ctx.fillStyle = "rgba(100, 100, 100, 0.8)"; // Gray for walls
    ctx.strokeStyle = "rgba(60, 60, 60, 1.0)";
    ctx.lineWidth = 1 / zoom;
    
    var wallThickness = 0.2;
    
    // Left wall - extends from bottom to 0.5 above water surface
    ctx.fillRect(
      waterX - wallThickness, 
      waterY - water.depth - wallThickness, 
      wallThickness, 
      water.depth + wallThickness + 0.5
    );
    
    // Right wall - extends from bottom to 0.5 above water surface
    ctx.fillRect(
      waterX + water.width, 
      waterY - water.depth - wallThickness, 
      wallThickness, 
      water.depth + wallThickness + 0.5
    );
    
    // Bottom floor
    ctx.fillRect(
      waterX - wallThickness, 
      waterY - water.depth - wallThickness, 
      water.width + 2 * wallThickness, 
      wallThickness
    );
    
    // Reset stroke style for next water zone
    ctx.strokeStyle = "rgba(32, 132, 191, 0.8)";
  }
  
  ctx.restore();
};
},{}],11:[function(require,module,exports){
var scatterPlot = require("./scatter-plot");

module.exports = {
  plotGraphs: function(graphElem, topScoresElem, scatterPlotElem, lastState, scores, config) {
    lastState = lastState || {};
    var generationSize = scores.length
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    var nextState = cw_storeGraphScores(
      lastState, scores, generationSize
    );
    // Debug: console.log(scores, nextState);
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
    cw_plotAverage(nextState, graphctx);
    cw_plotElite(nextState, graphctx);
    cw_plotTop(nextState, graphctx);
    cw_listTopScores(topScoresElem, nextState);
    nextState.scatterGraph = drawAllResults(
      scatterPlotElem, config, nextState, lastState.scatterGraph
    );
    return nextState;
  },
  clearGraphics: function(graphElem) {
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
  }
};


function cw_storeGraphScores(lastState, cw_carScores, generationSize) {
  // Debug: console.log(cw_carScores);
  
  // Store the top car's complete data including genome
  var topCarData = {
    score: cw_carScores[0].score,
    def: cw_carScores[0].def,  // Complete car definition with genome
    timestamp: Date.now()
  };
  
  return {
    cw_topScores: (lastState.cw_topScores || [])
    .concat([cw_carScores[0].score]),
    cw_topCarsWithGenome: (lastState.cw_topCarsWithGenome || [])
    .concat([topCarData]),
    cw_graphAverage: (lastState.cw_graphAverage || []).concat([
      cw_average(cw_carScores, generationSize)
    ]),
    cw_graphElite: (lastState.cw_graphElite || []).concat([
      cw_eliteaverage(cw_carScores, generationSize)
    ]),
    cw_graphTop: (lastState.cw_graphTop || []).concat([
      cw_carScores[0].score.v
    ]),
    allResults: (lastState.allResults || []).concat(cw_carScores),
  }
}

function cw_plotTop(state, graphctx) {
  var cw_graphTop = state.cw_graphTop;
  var graphsize = cw_graphTop.length;
  graphctx.strokeStyle = "#C83B3B";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphTop[k]);
  }
  graphctx.stroke();
}

function cw_plotElite(state, graphctx) {
  var cw_graphElite = state.cw_graphElite;
  var graphsize = cw_graphElite.length;
  graphctx.strokeStyle = "#7BC74D";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphElite[k]);
  }
  graphctx.stroke();
}

function cw_plotAverage(state, graphctx) {
  var cw_graphAverage = state.cw_graphAverage;
  var graphsize = cw_graphAverage.length;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphAverage[k]);
  }
  graphctx.stroke();
}


function cw_eliteaverage(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < Math.floor(generationSize / 2); k++) {
    sum += scores[k].score.v;
  }
  return sum / Math.floor(generationSize / 2);
}

function cw_average(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < generationSize; k++) {
    sum += scores[k].score.v;
  }
  return sum / generationSize;
}

function cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight) {
  graphcanvas.width = graphcanvas.width;
  graphctx.translate(0, graphheight);
  graphctx.scale(1, -1);
  graphctx.lineWidth = 1;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, graphheight / 2);
  graphctx.lineTo(graphwidth, graphheight / 2);
  graphctx.moveTo(0, graphheight / 4);
  graphctx.lineTo(graphwidth, graphheight / 4);
  graphctx.moveTo(0, graphheight * 3 / 4);
  graphctx.lineTo(graphwidth, graphheight * 3 / 4);
  graphctx.stroke();
}

function cw_listTopScores(elem, state) {
  var cw_topScores = state.cw_topScores;
  var cw_topCarsWithGenome = state.cw_topCarsWithGenome || [];
  var ts = elem;
  ts.innerHTML = "<b>Top Scores:</b><br />";
  
  // Create pairs of scores and genome data, sorted by score
  var topScoresWithGenome = [];
  for (var i = 0; i < cw_topScores.length && i < cw_topCarsWithGenome.length; i++) {
    topScoresWithGenome.push({
      score: cw_topScores[i],
      genome: cw_topCarsWithGenome[i]
    });
  }
  
  // Sort by score value descending
  topScoresWithGenome.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  });

  for (var k = 0; k < Math.min(10, topScoresWithGenome.length); k++) {
    var entry = topScoresWithGenome[k];
    var topScore = entry.score;
    var genomeData = entry.genome;
    
    var n = "#" + (k + 1) + ":";
    var score = Math.round(topScore.v * 100) / 100;
    var distance = "d:" + Math.round(topScore.x * 100) / 100;
    var yrange =  "h:" + Math.round(topScore.y2 * 100) / 100 + "/" + Math.round(topScore.y * 100) / 100 + "m";
    var gen = "(Gen " + topScore.i + ")";
    
    // Create a row with score info and genome button
    var rowDiv = document.createElement("div");
    rowDiv.className = "top-score-row";
    rowDiv.style.marginBottom = "5px";
    rowDiv.style.display = "flex";
    rowDiv.style.alignItems = "center";
    rowDiv.style.justifyContent = "space-between";
    
    var scoreSpan = document.createElement("span");
    scoreSpan.innerHTML = [n, score, distance, yrange, gen].join(" ");
    scoreSpan.style.flex = "1";
    
    var genomeButton = document.createElement("button");
    genomeButton.textContent = "View Genome";
    genomeButton.className = "genome-view-btn";
    genomeButton.style.marginLeft = "10px";
    genomeButton.style.padding = "2px 8px";
    genomeButton.style.fontSize = "12px";
    genomeButton.setAttribute("data-genome-index", k);
    
    // Store genome data for later access
    genomeButton.genomeData = genomeData;
    
    // Add click handler
    genomeButton.addEventListener("click", function() {
      if (window.showGenomeView) {
        window.showGenomeView(this.genomeData);
      } else {
        // Fallback if genome viewer not available
        alert("Genome viewer not yet initialized. Please wait a moment and try again.");
      }
    });
    
    rowDiv.appendChild(scoreSpan);
    rowDiv.appendChild(genomeButton);
    ts.appendChild(rowDiv);
  }
}

function drawAllResults(scatterPlotElem, config, allResults, previousGraph){
  if(!scatterPlotElem) return;
  return scatterPlot(scatterPlotElem, allResults, config.propertyMap, previousGraph)
}

},{"./scatter-plot":12}],12:[function(require,module,exports){
/* globals vis Highcharts */

// Called when the Visualization API is loaded.

module.exports = highCharts;
function highCharts(elem, scores){
  var keys = Object.keys(scores[0].def);
  keys = keys.reduce(function(curArray, key){
    var l = scores[0].def[key].length;
    var subArray = [];
    for(var i = 0; i < l; i++){
      subArray.push(key + "." + i);
    }
    return curArray.concat(subArray);
  }, []);
  function retrieveValue(obj, path){
    return path.split(".").reduce(function(curValue, key){
      return curValue[key];
    }, obj);
  }

  var dataObj = Object.keys(scores).reduce(function(kv, score){
    keys.forEach(function(key){
      kv[key].data.push([
        retrieveValue(score.def, key), score.score.v
      ])
    })
    return kv;
  }, keys.reduce(function(kv, key){
    kv[key] = {
      name: key,
      data: [],
    }
    return kv;
  }, {}))
  Highcharts.chart(elem.id, {
      chart: {
          type: 'scatter',
          zoomType: 'xy'
      },
      title: {
          text: 'Property Value to Score'
      },
      xAxis: {
          title: {
              enabled: true,
              text: 'Normalized'
          },
          startOnTick: true,
          endOnTick: true,
          showLastLabel: true
      },
      yAxis: {
          title: {
              text: 'Score'
          }
      },
      legend: {
          layout: 'vertical',
          align: 'left',
          verticalAlign: 'top',
          x: 100,
          y: 70,
          floating: true,
          backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF',
          borderWidth: 1
      },
      plotOptions: {
          scatter: {
              marker: {
                  radius: 5,
                  states: {
                      hover: {
                          enabled: true,
                          lineColor: 'rgb(100,100,100)'
                      }
                  }
              },
              states: {
                  hover: {
                      marker: {
                          enabled: false
                      }
                  }
              },
              tooltip: {
                  headerFormat: '<b>{series.name}</b><br>',
                  pointFormat: '{point.x}, {point.y}'
              }
          }
      },
      series: keys.map(function(key){
        return dataObj[key];
      })
  });
}

function visChart(elem, scores, propertyMap, graph) {

  // Create and populate a data table.
  var data = new vis.DataSet();
  scores.forEach(function(scoreInfo){
    data.add({
      x: getProperty(scoreInfo, propertyMap.x),
      y: getProperty(scoreInfo, propertyMap.x),
      z: getProperty(scoreInfo, propertyMap.z),
      style: getProperty(scoreInfo, propertyMap.z),
      // extra: def.ancestry
    });
  });

  function getProperty(info, key){
    if(key === "score"){
      return info.score.v
    } else {
      return info.def[key];
    }
  }

  // specify options
  var options = {
    width:  '600px',
    height: '600px',
    style: 'dot-size',
    showPerspective: true,
    showLegend: true,
    showGrid: true,
    showShadow: false,

    // Option tooltip can be true, false, or a function returning a string with HTML contents
    tooltip: function (point) {
      // parameter point contains properties x, y, z, and data
      // data is the original object passed to the point constructor
      return 'score: <b>' + point.z + '</b><br>'; // + point.data.extra;
    },

    // Tooltip default styling can be overridden
    tooltipStyle: {
      content: {
        background    : 'rgba(255, 255, 255, 0.7)',
        padding       : '10px',
        borderRadius  : '10px'
      },
      line: {
        borderLeft    : '1px dotted rgba(0, 0, 0, 0.5)'
      },
      dot: {
        border        : '5px solid rgba(0, 0, 0, 0.5)'
      }
    },

    keepAspectRatio: true,
    verticalRatio: 0.5
  };

  var camera = graph ? graph.getCameraPosition() : null;

  // create our graph
  var container = elem;
  graph = new vis.Graph3d(container, data, options);

  if (camera) graph.setCameraPosition(camera); // restore camera position
  return graph;
}

},{}],13:[function(require,module,exports){

module.exports = generateRandom;
function generateRandom(){
  return Math.random();
}

},{}],14:[function(require,module,exports){
// http://sunmingtao.blogspot.com/2016/11/inbreeding-coefficient.html
module.exports = getInbreedingCoefficient;

function getInbreedingCoefficient(child){
  var nameIndex = new Map();
  var flagged = new Set();
  var convergencePoints = new Set();
  createAncestryMap(child, []);

  var storedCoefficients = new Map();

  return Array.from(convergencePoints.values()).reduce(function(sum, point){
    var iCo = getCoefficient(point);
    return sum + iCo;
  }, 0);

  function createAncestryMap(initNode){
    var itemsInQueue = [{ node: initNode, path: [] }];
    do{
      var item = itemsInQueue.shift();
      var node = item.node;
      var path = item.path;
      if(processItem(node, path)){
        var nextPath = [ node.id ].concat(path);
        itemsInQueue = itemsInQueue.concat(node.ancestry.map(function(parent){
          return {
            node: parent,
            path: nextPath
          };
        }));
      }
    }while(itemsInQueue.length);


    function processItem(node, path){
      var newAncestor = !nameIndex.has(node.id);
      if(newAncestor){
        nameIndex.set(node.id, {
          parents: (node.ancestry || []).map(function(parent){
            return parent.id;
          }),
          id: node.id,
          children: [],
          convergences: [],
        });
      } else {

        flagged.add(node.id)
        nameIndex.get(node.id).children.forEach(function(childIdentifier){
          var offsets = findConvergence(childIdentifier.path, path);
          if(!offsets){
            return;
          }
          var childID = path[offsets[1]];
          convergencePoints.add(childID);
          nameIndex.get(childID).convergences.push({
            parent: node.id,
            offsets: offsets,
          });
        });
      }

      if(path.length){
        nameIndex.get(node.id).children.push({
          child: path[0],
          path: path
        });
      }

      if(!newAncestor){
        return;
      }
      if(!node.ancestry){
        return;
      }
      return true;
    }
  }

  function getCoefficient(id){
    if(storedCoefficients.has(id)){
      return storedCoefficients.get(id);
    }
    var node = nameIndex.get(id);
    var val = node.convergences.reduce(function(sum, point){
      return sum + Math.pow(1 / 2, point.offsets.reduce(function(sum, value){
        return sum + value;
      }, 1)) * (1 + getCoefficient(point.parent));
    }, 0);
    storedCoefficients.set(id, val);

    return val;

  }
  function findConvergence(listA, listB){
    var ci, cj, li, lj;
    outerloop:
    for(ci = 0, li = listA.length; ci < li; ci++){
      for(cj = 0, lj = listB.length; cj < lj; cj++){
        if(listA[ci] === listB[cj]){
          break outerloop;
        }
      }
    }
    if(ci === li){
      return false;
    }
    return [ci, cj];
  }
}

},{}],15:[function(require,module,exports){
var carConstruct = require("../car-schema/construct.js");

var carConstants = carConstruct.carConstants();

var schema = carConstruct.generateSchema(carConstants);
var pickParent = require("./pickParent");
var selectFromAllParents = require("./selectFromAllParents");
const constants = {
  generationSize: 20,
  schema: schema,
  championLength: 1,
  mutation_range: 1,
  gen_mutation: 0.05,
};
module.exports = function(){
  var currentChoices = new Map();
  return Object.assign(
    {},
    constants,
    {
      selectFromAllParents: selectFromAllParents,
      generateRandom: require("./generateRandom"),
      pickParent: pickParent.bind(void 0, currentChoices),
    }
  );
}
module.exports.constants = constants

},{"../car-schema/construct.js":2,"./generateRandom":13,"./pickParent":16,"./selectFromAllParents":17}],16:[function(require,module,exports){
var nAttributes = 15;
module.exports = pickParent;

function pickParent(currentChoices, chooseId, key /* , parents */){
  if(!currentChoices.has(chooseId)){
    currentChoices.set(chooseId, initializePick())
  }
  // console.log(chooseId);
  var state = currentChoices.get(chooseId);
  // console.log(state.curparent);
  state.i++
  if(["wheel_radius", "wheel_vertex", "wheel_density"].indexOf(key) > -1){
    state.curparent = cw_chooseParent(state);
    return state.curparent;
  }
  state.curparent = cw_chooseParent(state);
  return state.curparent;

  function cw_chooseParent(state) {
    var curparent = state.curparent;
    var attributeIndex = state.i;
    var swapPoint1 = state.swapPoint1
    var swapPoint2 = state.swapPoint2
    // console.log(swapPoint1, swapPoint2, attributeIndex)
    if ((swapPoint1 == attributeIndex) || (swapPoint2 == attributeIndex)) {
      return curparent == 1 ? 0 : 1
    }
    return curparent
  }

  function initializePick(){
    var curparent = 0;

    var swapPoint1 = Math.floor(Math.random() * (nAttributes));
    var swapPoint2 = swapPoint1;
    while (swapPoint2 == swapPoint1) {
      swapPoint2 = Math.floor(Math.random() * (nAttributes));
    }
    var i = 0;
    return {
      curparent: curparent,
      i: i,
      swapPoint1: swapPoint1,
      swapPoint2: swapPoint2
    }
  }
}

},{}],17:[function(require,module,exports){
var getInbreedingCoefficient = require("./inbreeding-coefficient");

module.exports = simpleSelect;

function simpleSelect(parents){
  var totalParents = parents.length
  var r = Math.random();
  if (r == 0)
    return 0;
  return Math.floor(-Math.log(r) * totalParents) % totalParents;
}

function selectFromAllParents(parents, parentList, previousParentIndex) {
  var previousParent = parents[previousParentIndex];
  var validParents = parents.filter(function(parent, i){
    if(previousParentIndex === i){
      return false;
    }
    if(!previousParent){
      return true;
    }
    var child = {
      id: Math.random().toString(32),
      ancestry: [previousParent, parent].map(function(p){
        return {
          id: p.def.id,
          ancestry: p.def.ancestry
        }
      })
    }
    var iCo = getInbreedingCoefficient(child);
    // Debug: console.log("inbreeding coefficient", iCo)
    if(iCo > 0.25){
      return false;
    }
    return true;
  })
  if(validParents.length === 0){
    return Math.floor(Math.random() * parents.length)
  }
  var totalScore = validParents.reduce(function(sum, parent){
    return sum + parent.score.v;
  }, 0);
  var r = totalScore * Math.random();
  for(var i = 0; i < validParents.length; i++){
    var score = validParents[i].score.v;
    if(r > score){
      r = r - score;
    } else {
      break;
    }
  }
  return i;
}

},{"./inbreeding-coefficient":14}],18:[function(require,module,exports){
/* globals document window */

var logger = require("./logger/logger.js");

module.exports = {
  initializeGenomeViewer: initializeGenomeViewer,
  showLeaderGenome: showLeaderGenome,
  showGenomeComparison: showGenomeComparison,
  closeGenomeViewer: closeGenomeViewer
};

function initializeGenomeViewer() {
  // Make functions globally available
  window.showLeaderGenome = showLeaderGenome;
  window.showGenomeView = showGenomeComparison;
  window.closeGenomeViewer = closeGenomeViewer;
  window.toggleComparisonMode = toggleComparisonMode;
  window.updateLeaderGenomeView = updateLeaderGenomeView;
  
  logger.log(logger.LOG_LEVELS.INFO, "Genome viewer initialized");
}

function showLeaderGenome() {
  var leaderGenome = window.getCurrentLeaderGenome();
  
  if (!leaderGenome || !leaderGenome.genome) {
    logger.log(logger.LOG_LEVELS.INFO, "No leader genome available to display");
    alert("No current leader available. Wait for cars to spawn.");
    return;
  }
  
  logger.log(logger.LOG_LEVELS.INFO, "Showing leader genome for car:", leaderGenome.carIndex);
  
  var modal = document.getElementById("genome-viewer-modal");
  var title = document.getElementById("genome-title");
  var comparisonMode = document.getElementById("comparison-mode");
  
  // Reset comparison mode
  comparisonMode.checked = false;
  toggleComparisonMode();
  
  title.textContent = `Current Leader Genome (Car #${leaderGenome.carIndex})`;
  
  displayGenomeData(leaderGenome.genome, "leader-genome-data");
  drawCarVisualization(leaderGenome.genome, "leader-car-visualization");
  
  modal.style.display = "block";
}

function showGenomeComparison(historicalCarData) {
  logger.log(logger.LOG_LEVELS.INFO, "Showing genome comparison with historical car");
  
  var modal = document.getElementById("genome-viewer-modal");
  var comparisonMode = document.getElementById("comparison-mode");
  
  // Enable comparison mode
  comparisonMode.checked = true;
  toggleComparisonMode();
  
  // Show leader genome
  var leaderGenome = window.getCurrentLeaderGenome();
  if (leaderGenome && leaderGenome.genome) {
    displayGenomeData(leaderGenome.genome, "leader-genome-data");
    drawCarVisualization(leaderGenome.genome, "leader-car-visualization");
  }
  
  // Show historical genome
  if (historicalCarData && historicalCarData.def) {
    displayGenomeData(historicalCarData.def, "comparison-genome-data");
    drawCarVisualization(historicalCarData.def, "comparison-car-visualization");
    
    var title = document.getElementById("genome-title");
    title.textContent = `Genome Comparison (Score: ${Math.round(historicalCarData.score.v * 100) / 100})`;
  }
  
  modal.style.display = "block";
}

function closeGenomeViewer() {
  var modal = document.getElementById("genome-viewer-modal");
  modal.style.display = "none";
  logger.log(logger.LOG_LEVELS.INFO, "Genome viewer closed");
}

function toggleComparisonMode() {
  var comparisonMode = document.getElementById("comparison-mode");
  var historicalSelect = document.getElementById("historical-car-select");
  var comparisonColumn = document.getElementById("comparison-genome");
  
  if (comparisonMode.checked) {
    historicalSelect.style.display = "inline";
    comparisonColumn.style.display = "block";
    populateHistoricalCarSelect();
  } else {
    historicalSelect.style.display = "none";
    comparisonColumn.style.display = "none";
  }
}

function populateHistoricalCarSelect() {
  var select = document.getElementById("historical-car-select");
  select.innerHTML = "<option value=''>Select a car...</option>";
  
  // Get historical cars from the graphState if available
  if (window.graphState && window.graphState.cw_topCarsWithGenome) {
    var topCars = window.graphState.cw_topCarsWithGenome.slice();
    
    // Sort by score descending
    topCars.sort(function(a, b) {
      return b.score.v - a.score.v;
    });
    
    topCars.slice(0, 10).forEach(function(carData, index) {
      var option = document.createElement("option");
      option.value = index;
      option.textContent = `#${index + 1}: ${Math.round(carData.score.v * 100) / 100} (Gen ${carData.score.i})`;
      option.carData = carData;
      select.appendChild(option);
    });
    
    select.addEventListener("change", function() {
      var selectedOption = this.options[this.selectedIndex];
      if (selectedOption.carData) {
        showGenomeComparison(selectedOption.carData);
      }
    });
  }
}

function updateLeaderGenomeView(newLeaderGenome) {
  var modal = document.getElementById("genome-viewer-modal");
  
  // Only update if the genome viewer is currently open
  if (modal.style.display === "block") {
    logger.log(logger.LOG_LEVELS.INFO, "Updating leader genome view for car:", newLeaderGenome.carIndex);
    
    var title = document.getElementById("genome-title");
    title.textContent = `Current Leader Genome (Car #${newLeaderGenome.carIndex})`;
    
    displayGenomeData(newLeaderGenome.genome, "leader-genome-data");
    drawCarVisualization(newLeaderGenome.genome, "leader-car-visualization");
  }
}

function displayGenomeData(genome, containerId) {
  var container = document.getElementById(containerId);
  if (!container || !genome) return;
  
  var html = "";
  
  // Wheel properties
  if (genome.wheel_radius && genome.wheel_density && genome.wheel_vertex) {
    html += "<div class='genome-property'>";
    html += "<label>Wheels (" + genome.wheel_radius.length + "):</label>";
    
    for (var i = 0; i < genome.wheel_radius.length; i++) {
      html += "<div style='margin: 5px 0; padding: 5px; background: var(--bg-primary); border-radius: 3px;'>";
      html += "<strong>Wheel " + (i + 1) + ":</strong><br>";
      html += "<span class='genome-value'>Radius: " + (Math.round(genome.wheel_radius[i] * 100) / 100) + "</span><br>";
      html += "<span class='genome-value'>Density: " + (Math.round(genome.wheel_density[i] * 100) / 100) + "</span><br>";
      html += "<span class='genome-value'>Position: Vertex " + (genome.wheel_vertex[i] + 1) + "</span>";
      html += "</div>";
    }
    html += "</div>";
  }
  
  // Chassis density
  if (genome.chassis_density) {
    html += "<div class='genome-property'>";
    html += "<label>Chassis Density:</label>";
    html += "<span class='genome-value'>" + (Math.round(genome.chassis_density[0] * 100) / 100) + "</span>";
    html += "</div>";
  }
  
  // Chassis shape (vertices)
  if (genome.vertex_list) {
    html += "<div class='genome-property'>";
    html += "<label>Chassis Shape (12 vertices):</label>";
    html += "<div style='display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px;'>";
    
    for (var j = 0; j < genome.vertex_list.length; j += 2) {
      var x = Math.round(genome.vertex_list[j] * 100) / 100;
      var y = Math.round(genome.vertex_list[j + 1] * 100) / 100;
      html += "<div style='background: var(--bg-primary); padding: 3px; border-radius: 2px; font-size: 12px;'>";
      html += "<span class='genome-value'>V" + (j/2 + 1) + ": (" + x + ", " + y + ")</span>";
      html += "</div>";
    }
    html += "</div>";
    html += "</div>";
  }
  
  // Car ID and ancestry if available
  if (genome.id) {
    html += "<div class='genome-property'>";
    html += "<label>Car ID:</label>";
    html += "<span class='genome-value'>" + genome.id.substring(0, 8) + "...</span>";
    html += "</div>";
  }
  
  container.innerHTML = html;
}

function drawCarVisualization(genome, canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || !genome) return;
  
  var ctx = canvas.getContext("2d");
  var width = canvas.width;
  var height = canvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Set up coordinate system (center origin, scale up)
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(30, -30); // Scale and flip Y axis
  
  // Get theme colors
  var isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  var chassisColor = isDarkMode ? '#4a90e2' : '#3F72AF';
  var wheelColor = isDarkMode ? '#ff6b6b' : '#BE4747';
  
  // Draw chassis if vertex data exists
  if (genome.vertex_list && genome.vertex_list.length >= 12) {
    ctx.beginPath();
    ctx.strokeStyle = chassisColor;
    ctx.fillStyle = chassisColor + '40'; // Semi-transparent
    ctx.lineWidth = 0.05;
    
    // Move to first vertex
    ctx.moveTo(genome.vertex_list[0], genome.vertex_list[1]);
    
    // Draw lines to other vertices
    for (var i = 2; i < genome.vertex_list.length; i += 2) {
      ctx.lineTo(genome.vertex_list[i], genome.vertex_list[i + 1]);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  
  // Draw wheels
  if (genome.wheel_radius && genome.wheel_vertex && genome.vertex_list) {
    ctx.fillStyle = wheelColor;
    ctx.strokeStyle = wheelColor;
    ctx.lineWidth = 0.03;
    
    for (var j = 0; j < genome.wheel_radius.length; j++) {
      if (genome.wheel_vertex[j] !== undefined) {
        var vertexIndex = genome.wheel_vertex[j] * 2;
        if (vertexIndex < genome.vertex_list.length - 1) {
          var wheelX = genome.vertex_list[vertexIndex];
          var wheelY = genome.vertex_list[vertexIndex + 1];
          var radius = genome.wheel_radius[j];
          
          ctx.beginPath();
          ctx.arc(wheelX, wheelY, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }
  
  ctx.restore();
}
},{"./logger/logger.js":22}],19:[function(require,module,exports){

module.exports = function(car) {
  var out = {
    chassis: ghost_get_chassis(car.chassis),
    wheels: [],
    pos: {x: car.chassis.GetPosition().x, y: car.chassis.GetPosition().y}
  };

  for (var i = 0; i < car.wheels.length; i++) {
    out.wheels[i] = ghost_get_wheel(car.wheels[i]);
  }

  return out;
}

function ghost_get_chassis(c) {
  var gc = [];

  for (var f = c.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var p = {
      vtx: [],
      num: 0
    }

    p.num = s.m_vertexCount;

    for (var i = 0; i < s.m_vertexCount; i++) {
      p.vtx.push(c.GetWorldPoint(s.m_vertices[i]));
    }

    gc.push(p);
  }

  return gc;
}

function ghost_get_wheel(w) {
  var gw = [];

  for (var f = w.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var c = {
      pos: w.GetWorldPoint(s.m_p),
      rad: s.m_radius,
      ang: w.m_sweep.a
    }

    gw.push(c);
  }

  return gw;
}

},{}],20:[function(require,module,exports){

var ghost_get_frame = require("./car-to-ghost.js");

var enable_ghost = true;

module.exports = {
  ghost_create_replay: ghost_create_replay,
  ghost_create_ghost: ghost_create_ghost,
  ghost_pause: ghost_pause,
  ghost_resume: ghost_resume,
  ghost_get_position: ghost_get_position,
  ghost_compare_to_replay: ghost_compare_to_replay,
  ghost_move_frame: ghost_move_frame,
  ghost_add_replay_frame: ghost_add_replay_frame,
  ghost_draw_frame: ghost_draw_frame,
  ghost_reset_ghost: ghost_reset_ghost
}

function ghost_create_replay() {
  if (!enable_ghost)
    return null;

  return {
    num_frames: 0,
    frames: [],
  }
}

function ghost_create_ghost() {
  if (!enable_ghost)
    return null;

  return {
    replay: null,
    frame: 0,
    dist: -100
  }
}

function ghost_reset_ghost(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  ghost.frame = 0;
}

function ghost_pause(ghost) {
  if (ghost != null)
    ghost.old_frame = ghost.frame;
  ghost_reset_ghost(ghost);
}

function ghost_resume(ghost) {
  if (ghost != null)
    ghost.frame = ghost.old_frame;
}

function ghost_get_position(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.frame < 0)
    return;
  if (ghost.replay == null)
    return;
  var frame = ghost.replay.frames[ghost.frame];
  return frame.pos;
}

function ghost_compare_to_replay(replay, ghost, max) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (replay == null)
    return;

  if (ghost.dist < max) {
    ghost.replay = replay;
    ghost.dist = max;
    ghost.frame = 0;
  }
}

function ghost_move_frame(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.replay == null)
    return;
  ghost.frame++;
  if (ghost.frame >= ghost.replay.num_frames)
    ghost.frame = ghost.replay.num_frames - 1;
}

function ghost_add_replay_frame(replay, car) {
  if (!enable_ghost)
    return;
  if (replay == null)
    return;

  var frame = ghost_get_frame(car);
  replay.frames.push(frame);
  replay.num_frames++;
}

function ghost_draw_frame(ctx, ghost, camera) {
  var zoom = camera.zoom;
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.frame < 0)
    return;
  if (ghost.replay == null)
    return;

  var frame = ghost.replay.frames[ghost.frame];

  // wheel style
  ctx.fillStyle = "#eee";
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1 / zoom;

  for (var i = 0; i < frame.wheels.length; i++) {
    for (var w in frame.wheels[i]) {
      ghost_draw_circle(ctx, frame.wheels[i][w].pos, frame.wheels[i][w].rad, frame.wheels[i][w].ang);
    }
  }

  // chassis style
  ctx.strokeStyle = "#aaa";
  ctx.fillStyle = "#eee";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (var c in frame.chassis)
    ghost_draw_poly(ctx, frame.chassis[c].vtx, frame.chassis[c].num);
  ctx.fill();
  ctx.stroke();
}

function ghost_draw_poly(ctx, vtx, n_vtx) {
  ctx.moveTo(vtx[0].x, vtx[0].y);
  for (var i = 1; i < n_vtx; i++) {
    ctx.lineTo(vtx[i].x, vtx[i].y);
  }
  ctx.lineTo(vtx[0].x, vtx[0].y);
}

function ghost_draw_circle(ctx, center, radius, angle) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(center.x, center.y);
  ctx.lineTo(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{"./car-to-ghost.js":19}],21:[function(require,module,exports){
/* globals document performance localStorage alert confirm btoa HTMLDivElement */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");
var carConstruct = require("./car-schema/construct.js");

var manageRound = require("./machine-learning/genetic-algorithm/manage-round.js");

var ghost_fns = require("./ghost/index.js");

var drawCar = require("./draw/draw-car.js");
var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;
var cw_clearGraphics = graph_fns.clearGraphics;
var cw_drawFloor = require("./draw/draw-floor.js");
var cw_drawWater = require("./draw/draw-water.js");

var ghost_draw_frame = ghost_fns.ghost_draw_frame;
var ghost_create_ghost = ghost_fns.ghost_create_ghost;
var ghost_add_replay_frame = ghost_fns.ghost_add_replay_frame;
var ghost_compare_to_replay = ghost_fns.ghost_compare_to_replay;
var ghost_get_position = ghost_fns.ghost_get_position;
var ghost_move_frame = ghost_fns.ghost_move_frame;
var ghost_reset_ghost = ghost_fns.ghost_reset_ghost
var ghost_pause = ghost_fns.ghost_pause;
var ghost_resume = ghost_fns.ghost_resume;
var ghost_create_replay = ghost_fns.ghost_create_replay;

var cw_Car = require("./draw/draw-car-stats.js");
var genomeViewer = require("./genome-viewer.js");
var logger = require("./logger/logger.js");
var ghost;
var carMap = new Map();

var doDraw = true;
var cw_paused = false;

var box2dfps = 60;
var screenfps = 60;
var skipTicks = Math.round(1000 / box2dfps);
var maxFrameSkip = skipTicks * 2;

// Speed control
var speedMultiplier = 1.0; // Default to 1x (normal speed)
var lastFrameTime = 0;
var frameDelay = 1000 / 60; // Base delay for 60 FPS

var canvas = document.getElementById("mainbox");
var ctx = canvas.getContext("2d");

var camera = {
  speed: 0.05,
  pos: {
    x: 0, y: 0
  },
  target: -1,
  zoom: 70
}

var minimapcamera = document.getElementById("minimapcamera").style;
var minimapholder = document.querySelector("#minimapholder");

var minimapcanvas = document.getElementById("minimap");
var minimapctx = minimapcanvas.getContext("2d");
var minimapscale = 3;
var minimapfogdistance = 0;
var fogdistance = document.getElementById("minimapfog").style;


var carConstants = carConstruct.carConstants();


var max_car_health = box2dfps * 10;

var cw_ghostReplayInterval = null;

var distanceMeter = document.getElementById("distancemeter");
var heightMeter = document.getElementById("heightmeter");

var leaderPosition = {
  x: 0, y: 0
}

// Leader genome tracking
var currentLeaderGenome = {
  carIndex: -1,
  genome: null,
  timestamp: null
}

minimapcamera.width = 12 * minimapscale + "px";
minimapcamera.height = 6 * minimapscale + "px";


// ======= WORLD STATE ======
var generationConfig = require("./generation-config");


var world_def = {
  gravity: new b2Vec2(0.0, -9.81),
  doSleep: true,
  floorseed: btoa(Math.seedrandom()),
  tileDimensions: new b2Vec2(1.5, 0.15),
  maxFloorTiles: 200,
  mutable_floor: false,
  waterEnabled: true,
  box2dfps: box2dfps,
  motorSpeed: 20,
  max_car_health: max_car_health,
  schema: generationConfig.constants.schema
}

var cw_deadCars;
var graphState = {
  cw_topScores: [],
  cw_topCarsWithGenome: [],
  cw_graphAverage: [],
  cw_graphElite: [],
  cw_graphTop: [],
};

function resetGraphState(){
  graphState = {
    cw_topScores: [],
    cw_topCarsWithGenome: [],
    cw_graphAverage: [],
    cw_graphElite: [],
    cw_graphTop: [],
  };
}



// ==========================

var generationState;

// ======== Activity State ====
var currentRunner;
var loops = 0;
var nextGameTick = (new Date).getTime();

function showDistance(distance, height) {
  distanceMeter.innerHTML = distance + " meters<br />";
  heightMeter.innerHTML = height + " meters";
  if (distance > minimapfogdistance) {
    fogdistance.width = 800 - Math.round(distance + 15) * minimapscale + "px";
    minimapfogdistance = distance;
  }
}



/* === END Car ============================================================= */
/* ========================================================================= */


/* ========================================================================= */
/* ==== Generation ========================================================= */

function cw_generationZero() {

  generationState = manageRound.generationZero(generationConfig());
}

function resetCarUI(){
  cw_deadCars = 0;
  leaderPosition = {
    x: 0, y: 0
  };
  
  // Reset leader genome tracking
  currentLeaderGenome = {
    carIndex: -1,
    genome: null,
    timestamp: null
  };
  
  document.getElementById("generation").innerHTML = generationState.counter.toString();
  document.getElementById("cars").innerHTML = "";
  document.getElementById("population").innerHTML = generationConfig.constants.generationSize.toString();
}

/* ==== END Genration ====================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  var floorTiles = currentRunner.scene.floorTiles;
  var waterZones = currentRunner.scene.waterZones;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  cw_setCameraPosition();
  var camera_x = camera.pos.x;
  var camera_y = camera.pos.y;
  var zoom = camera.zoom;
  ctx.translate(200 - (camera_x * zoom), 200 + (camera_y * zoom));
  ctx.scale(zoom, -zoom);
  cw_drawFloor(ctx, camera, floorTiles);
  cw_drawWater(ctx, camera, waterZones);
  ghost_draw_frame(ctx, ghost, camera);
  cw_drawCars();
  ctx.restore();
}

function cw_minimapCamera(/* x, y*/) {
  var camera_x = camera.pos.x
  var camera_y = camera.pos.y
  minimapcamera.left = Math.round((2 + camera_x) * minimapscale) + "px";
  minimapcamera.top = Math.round((31 - camera_y) * minimapscale) + "px";
}

function cw_setCameraTarget(k) {
  camera.target = k;
}

function cw_setCameraPosition() {
  var cameraTargetPosition
  if (camera.target !== -1) {
    cameraTargetPosition = carMap.get(camera.target).getPosition();
  } else {
    cameraTargetPosition = leaderPosition;
  }
  var diff_y = camera.pos.y - cameraTargetPosition.y;
  var diff_x = camera.pos.x - cameraTargetPosition.x;
  camera.pos.y -= camera.speed * diff_y;
  camera.pos.x -= camera.speed * diff_x;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
}

function cw_drawGhostReplay() {
  var floorTiles = currentRunner.scene.floorTiles;
  var waterZones = currentRunner.scene.waterZones;
  var carPosition = ghost_get_position(ghost);
  camera.pos.x = carPosition.x;
  camera.pos.y = carPosition.y;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
  showDistance(
    Math.round(carPosition.x * 100) / 100,
    Math.round(carPosition.y * 100) / 100
  );
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(
    200 - (carPosition.x * camera.zoom),
    200 + (carPosition.y * camera.zoom)
  );
  ctx.scale(camera.zoom, -camera.zoom);
  cw_drawFloor(ctx, camera, floorTiles);
  cw_drawWater(ctx, camera, waterZones);
  ghost_draw_frame(ctx, ghost);
  ghost_move_frame(ghost);
  ctx.restore();
}


function cw_drawCars() {
  var cw_carArray = Array.from(carMap.values());
  for (var k = (cw_carArray.length - 1); k >= 0; k--) {
    var myCar = cw_carArray[k];
    drawCar(carConstants, myCar, camera, ctx)
  }
}

function toggleDisplay() {
  canvas.width = canvas.width;
  if (doDraw) {
    doDraw = false;
    cw_stopSimulation();
    cw_runningInterval = setInterval(function () {
      var time = performance.now() + (1000 / screenfps);
      while (time > performance.now()) {
        simulationStep();
      }
    }, 1);
  } else {
    doDraw = true;
    clearInterval(cw_runningInterval);
    cw_startSimulation();
  }
}

function cw_drawMiniMap() {
  var floorTiles = currentRunner.scene.floorTiles;
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  minimapfogdistance = 0;
  fogdistance.width = "800px";
  minimapcanvas.width = minimapcanvas.width;
  minimapctx.strokeStyle = "#3F72AF";
  minimapctx.beginPath();
  minimapctx.moveTo(0, 35 * minimapscale);
  for (var k = 0; k < floorTiles.length; k++) {
    last_tile = floorTiles[k];
    var last_fixture = last_tile.GetFixtureList();
    var last_world_coords = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
    tile_position = last_world_coords;
    minimapctx.lineTo((tile_position.x + 5) * minimapscale, (-tile_position.y + 35) * minimapscale);
  }
  minimapctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */
var uiListeners = {
  preCarStep: function(){
    ghost_move_frame(ghost);
  },
  carStep(car){
    updateCarUI(car);
  },
  carDeath(carInfo){

    var k = carInfo.index;

    var car = carInfo.car, score = carInfo.score;
    carMap.get(carInfo).kill(currentRunner, world_def);

    // refocus camera to leader on death
    if (camera.target == carInfo) {
      cw_setCameraTarget(-1);
    }
    // console.log(score);
    carMap.delete(carInfo);
    ghost_compare_to_replay(car.replay, ghost, score.v);
    score.i = generationState.counter;

    cw_deadCars++;
    var generationSize = generationConfig.constants.generationSize;
    document.getElementById("population").innerHTML = (generationSize - cw_deadCars).toString();

    // console.log(leaderPosition.leader, k)
    if (leaderPosition.leader == k) {
      // leader is dead, find new leader
      cw_findLeader();
    }
  },
  generationEnd(results){
    cleanupRound(results);
    return cw_newRound(results);
  }
}

function simulationStep() {  
  currentRunner.step();
  showDistance(
    Math.round(leaderPosition.x * 100) / 100,
    Math.round(leaderPosition.y * 100) / 100
  );
}

function gameLoop(currentTime) {
  if (!lastFrameTime) lastFrameTime = currentTime;
  
  var deltaTime = currentTime - lastFrameTime;
  var targetDelay = frameDelay / speedMultiplier;
  
  if (deltaTime >= targetDelay) {
    loops = 0;
    while (!cw_paused && (new Date).getTime() > nextGameTick && loops < maxFrameSkip) {   
      nextGameTick += skipTicks;
      loops++;
    }
    
    simulationStep();
    cw_drawScreen();
    
    lastFrameTime = currentTime;
  }

  if(!cw_paused) window.requestAnimationFrame(gameLoop);
}

function updateCarUI(carInfo){
  var k = carInfo.index;
  var car = carMap.get(carInfo);
  var position = car.getPosition();

  ghost_add_replay_frame(car.replay, car.car.car);
  car.minimapmarker.style.left = Math.round((position.x + 5) * minimapscale) + "px";
  car.healthBar.width = Math.round((car.car.state.health / max_car_health) * 100) + "%";
  if (position.x > leaderPosition.x) {
    leaderPosition = position;
    leaderPosition.leader = k;
    
    // Update leader genome tracking
    currentLeaderGenome.carIndex = k;
    currentLeaderGenome.genome = carInfo.def;
    currentLeaderGenome.timestamp = Date.now();
    
    logger.log(logger.LOG_LEVELS.INFO, "New leader detected - Car #" + k + " genome tracked");
    
    // Trigger genome view update if it's open
    if (window.updateLeaderGenomeView) {
      window.updateLeaderGenomeView(currentLeaderGenome);
    }
    
    // console.log("new leader: ", k);
  }
}

function cw_findLeader() {
  var lead = 0;
  var newLeaderIndex = -1;
  var newLeaderCarInfo = null;
  var cw_carArray = Array.from(carMap.values());
  
  for (var k = 0; k < cw_carArray.length; k++) {
    if (!cw_carArray[k].alive) {
      continue;
    }
    var position = cw_carArray[k].getPosition();
    if (position.x > lead) {
      lead = position.x;
      leaderPosition = position;
      leaderPosition.leader = k;
      newLeaderIndex = k;
      newLeaderCarInfo = cw_carArray[k].car;
    }
  }
  
  // Update leader genome if leader changed
  if (newLeaderIndex !== currentLeaderGenome.carIndex && newLeaderCarInfo) {
    currentLeaderGenome.carIndex = newLeaderIndex;
    currentLeaderGenome.genome = newLeaderCarInfo.def;
    currentLeaderGenome.timestamp = Date.now();
    
    logger.log(logger.LOG_LEVELS.INFO, "Leader changed via findLeader - Car #" + newLeaderIndex + " genome tracked");
    
    // Trigger genome view update if it's open
    if (window.updateLeaderGenomeView) {
      window.updateLeaderGenomeView(currentLeaderGenome);
    }
  }
}

function fastForward(){
  var gen = generationState.counter;
  while(gen === generationState.counter){
    currentRunner.step();
  }
}

function cleanupRound(results){

  results.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  })
  graphState = plot_graphs(
    document.getElementById("graphcanvas"),
    document.getElementById("topscores"),
    null,
    graphState,
    results
  );
}

function cw_newRound(results) {
  camera.pos.x = camera.pos.y = 0;
  cw_setCameraTarget(-1);

  generationState = manageRound.nextGeneration(
    generationState, results, generationConfig()
  );
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    ghost = null;
    world_def.floorseed = btoa(Math.seedrandom());
  } else {
    // RE-ENABLE GHOST
    ghost_reset_ghost(ghost);
  }
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  resetCarUI();
}

function cw_startSimulation() {
  cw_paused = false;
  window.requestAnimationFrame(gameLoop);
}

function cw_stopSimulation() {
  cw_paused = true;
}

function cw_clearPopulationWorld() {
  carMap.forEach(function(car){
    car.kill(currentRunner, world_def);
  });
}

function cw_resetPopulationUI() {
  document.getElementById("generation").innerHTML = "";
  document.getElementById("cars").innerHTML = "";
  document.getElementById("topscores").innerHTML = "";
  cw_clearGraphics(document.getElementById("graphcanvas"));
  resetGraphState();
}

function cw_resetWorld() {
  doDraw = true;
  cw_stopSimulation();
  world_def.floorseed = document.getElementById("newseed").value;
  cw_clearPopulationWorld();
  cw_resetPopulationUI();

  Math.seedrandom();
  cw_generationZero();
  currentRunner = worldRun(
    world_def, generationState.generation, uiListeners
  );

  ghost = ghost_create_ghost();
  resetCarUI();
  setupCarUI()
  cw_drawMiniMap();

  cw_startSimulation();
}

function setupCarUI(){
  currentRunner.cars.map(function(carInfo){
    var car = new cw_Car(carInfo, carMap);
    carMap.set(carInfo, car);
    car.replay = ghost_create_replay();
    ghost_add_replay_frame(car.replay, car.car.car);
  })
}


document.querySelector("#fast-forward").addEventListener("click", function(){
  fastForward()
});

document.querySelector("#save-progress").addEventListener("click", function(){
  saveProgress()
});

document.querySelector("#restore-progress").addEventListener("click", function(){
  restoreProgress()
});

document.querySelector("#toggle-display").addEventListener("click", function(){
  toggleDisplay()
})

document.querySelector("#new-population").addEventListener("click", function(){
  cw_resetPopulationUI()
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
})

function saveProgress() {
  localStorage.cw_savedGeneration = JSON.stringify(generationState.generation);
  localStorage.cw_genCounter = generationState.counter;
  localStorage.cw_ghost = JSON.stringify(ghost);
  localStorage.cw_topScores = JSON.stringify(graphState.cw_topScores);
  localStorage.cw_topCarsWithGenome = JSON.stringify(graphState.cw_topCarsWithGenome);
  localStorage.cw_floorSeed = world_def.floorseed;
}

function restoreProgress() {
  if (typeof localStorage.cw_savedGeneration == 'undefined' || localStorage.cw_savedGeneration == null) {
    alert("No saved progress found");
    return;
  }
  cw_stopSimulation();
  generationState.generation = JSON.parse(localStorage.cw_savedGeneration);
  generationState.counter = localStorage.cw_genCounter;
  ghost = JSON.parse(localStorage.cw_ghost);
  graphState.cw_topScores = JSON.parse(localStorage.cw_topScores);
  
  // Restore genome data if available (backward compatibility)
  if (localStorage.cw_topCarsWithGenome) {
    graphState.cw_topCarsWithGenome = JSON.parse(localStorage.cw_topCarsWithGenome);
  } else {
    graphState.cw_topCarsWithGenome = [];
  }
  
  world_def.floorseed = localStorage.cw_floorSeed;
  document.getElementById("newseed").value = world_def.floorseed;

  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  cw_drawMiniMap();
  Math.seedrandom();

  resetCarUI();
  cw_startSimulation();
}

document.querySelector("#confirm-reset").addEventListener("click", function(){
  cw_confirmResetWorld()
})

function cw_confirmResetWorld() {
  if (confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

// ghost replay stuff


function cw_pauseSimulation() {
  cw_paused = true;
  ghost_pause(ghost);
}

function cw_resumeSimulation() {
  cw_paused = false;
  ghost_resume(ghost);
  window.requestAnimationFrame(gameLoop);
}

function cw_startGhostReplay() {
  if (!doDraw) {
    toggleDisplay();
  }
  cw_pauseSimulation();
  cw_ghostReplayInterval = setInterval(cw_drawGhostReplay, Math.round(1000 / screenfps));
}

function cw_stopGhostReplay() {
  clearInterval(cw_ghostReplayInterval);
  cw_ghostReplayInterval = null;
  cw_findLeader();
  camera.pos.x = leaderPosition.x;
  camera.pos.y = leaderPosition.y;
  cw_resumeSimulation();
}

document.querySelector("#toggle-ghost").addEventListener("click", function(e){
  cw_toggleGhostReplay(e.target)
})

function cw_toggleGhostReplay(button) {
  if (cw_ghostReplayInterval == null) {
    cw_startGhostReplay();
    button.value = "Resume simulation";
  } else {
    cw_stopGhostReplay();
    button.value = "View top replay";
  }
}
// ghost replay stuff END

// initial stuff, only called once (hopefully)
function cw_init() {
  // Check for stored wheel count and apply it
  var storedWheelCount = localStorage.getItem('wheelCount');
  if (storedWheelCount) {
    var wheelCount = parseInt(storedWheelCount, 10);
    logger.log(logger.LOG_LEVELS.DEBUG, "Restoring wheel count from localStorage:", wheelCount);
    
    // Update car constants
    var currentConstants = carConstruct.carConstants();
    currentConstants.wheelCount = wheelCount;
    
    // Regenerate schema
    var newSchema = carConstruct.generateSchema(currentConstants);
    generationConfig.constants.schema = newSchema;
    world_def.schema = newSchema;
    
    // Update the select element to match
    var wheelSelect = document.querySelector('#wheelcount');
    if (wheelSelect) {
      wheelSelect.value = wheelCount;
    }
  }
  
  // Speed always starts at default (1x) - no localStorage persistence
  logger.log(logger.LOG_LEVELS.DEBUG, "Starting with default simulation speed:", speedMultiplier + "x");
  
  // Check for stored water setting and apply it
  var storedWater = localStorage.getItem('waterEnabled');
  if (storedWater) {
    logger.log(logger.LOG_LEVELS.DEBUG, "Restoring water setting from localStorage:", storedWater);
    world_def.waterEnabled = (storedWater === "enabled");
    
    // Update the select element to match
    var waterSelect = document.querySelector('#water');
    if (waterSelect) {
      waterSelect.value = storedWater;
    }
  }
  
  // clone silver dot and health bar
  var mmm = document.getElementsByName('minimapmarker')[0];
  var hbar = document.getElementsByName('healthbar')[0];
  var generationSize = generationConfig.constants.generationSize;

  for (var k = 0; k < generationSize; k++) {

    // minimap markers
    var newbar = mmm.cloneNode(true);
    newbar.id = "bar" + k;
    newbar.style.paddingTop = k * 9 + "px";
    minimapholder.appendChild(newbar);

    // health bars
    var newhealth = hbar.cloneNode(true);
    newhealth.getElementsByTagName("DIV")[0].id = "health" + k;
    newhealth.car_index = k;
    document.getElementById("health").appendChild(newhealth);
  }
  mmm.parentNode.removeChild(mmm);
  hbar.parentNode.removeChild(hbar);
  world_def.floorseed = btoa(Math.seedrandom());
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  
  // Initialize genome viewer
  genomeViewer.initializeGenomeViewer();
  
  window.requestAnimationFrame(gameLoop);
  
}

function relMouseCoords(event) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = this;

  do {
    totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
    totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    currentElement = currentElement.offsetParent
  }
  while (currentElement);

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return {x: canvasX, y: canvasY}
}
HTMLDivElement.prototype.relMouseCoords = relMouseCoords;
minimapholder.onclick = function (event) {
  var coords = minimapholder.relMouseCoords(event);
  var cw_carArray = Array.from(carMap.values());
  var closest = {
    value: cw_carArray[0].car,
    dist: Math.abs(((cw_carArray[0].getPosition().x + 6) * minimapscale) - coords.x),
    x: cw_carArray[0].getPosition().x
  }

  var maxX = 0;
  for (var i = 0; i < cw_carArray.length; i++) {
    var pos = cw_carArray[i].getPosition();
    var dist = Math.abs(((pos.x + 6) * minimapscale) - coords.x);
    if (dist < closest.dist) {
      closest.value = cw_carArray.car;
      closest.dist = dist;
      closest.x = pos.x;
    }
    maxX = Math.max(pos.x, maxX);
  }

  if (closest.x == maxX) { // focus on leader again
    cw_setCameraTarget(-1);
  } else {
    cw_setCameraTarget(closest.value);
  }
}


document.querySelector("#mutationrate").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutation(elem.options[elem.selectedIndex].value)
})

document.querySelector("#mutationsize").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutationRange(elem.options[elem.selectedIndex].value)
})

document.querySelector("#floor").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutableFloor(elem.options[elem.selectedIndex].value)
});

document.querySelector("#gravity").addEventListener("change", function(e){
  var elem = e.target
  cw_setGravity(elem.options[elem.selectedIndex].value)
})

document.querySelector("#elitesize").addEventListener("change", function(e){
  var elem = e.target
  cw_setEliteSize(elem.options[elem.selectedIndex].value)
})

document.querySelector("#wheelcount").addEventListener("change", function(e){
  var elem = e.target
  cw_setWheelCount(elem.options[elem.selectedIndex].value)
})

document.querySelector("#speed").addEventListener("change", function(e){
  var elem = e.target
  cw_setSpeed(elem.options[elem.selectedIndex].value)
})

document.querySelector("#water").addEventListener("change", function(e){
  var elem = e.target
  cw_setWater(elem.options[elem.selectedIndex].value)
})

function cw_setMutation(mutation) {
  generationConfig.constants.gen_mutation = parseFloat(mutation);
}

function cw_setMutationRange(range) {
  generationConfig.constants.mutation_range = parseFloat(range);
}

function cw_setMutableFloor(choice) {
  world_def.mutable_floor = (choice == 1);
}

function cw_setGravity(choice) {
  world_def.gravity = new b2Vec2(0.0, -parseFloat(choice));
  var world = currentRunner.scene.world
  // CHECK GRAVITY CHANGES
  if (world.GetGravity().y != world_def.gravity.y) {
    world.SetGravity(world_def.gravity);
  }
}

function cw_setEliteSize(clones) {
  generationConfig.constants.championLength = parseInt(clones, 10);
}

function cw_setSpeed(speed) {
  var newSpeed = parseFloat(speed);
  logger.log(logger.LOG_LEVELS.DEBUG, "Changing simulation speed to:", newSpeed + "x");
  
  speedMultiplier = newSpeed;
  lastFrameTime = 0; // Reset timing when speed changes
  
  logger.log(logger.LOG_LEVELS.DEBUG, "New simulation speed:", speedMultiplier + "x");
}

function cw_setWater(state) {
  var waterEnabled = (state === "enabled");
  logger.log(logger.LOG_LEVELS.DEBUG, "Changing water setting to:", waterEnabled ? "enabled" : "disabled");
  
  world_def.waterEnabled = waterEnabled;
  
  // Store water setting in localStorage for persistence
  localStorage.setItem('waterEnabled', state);
  
  logger.log(logger.LOG_LEVELS.DEBUG, "Water setting will take effect on next generation");
}

function cw_setWheelCount(wheelCount) {
  var newWheelCount = parseInt(wheelCount, 10);
  logger.log(logger.LOG_LEVELS.DEBUG, "Changing wheel count to:", newWheelCount);
  
  // Store the wheel count in localStorage to persist across reloads
  localStorage.setItem('wheelCount', newWheelCount);
  
  // Update the car constants  
  var currentConstants = carConstruct.carConstants();
  currentConstants.wheelCount = newWheelCount;
  
  // Regenerate schema with new wheel count
  var newSchema = carConstruct.generateSchema(currentConstants);
  generationConfig.constants.schema = newSchema;
  world_def.schema = newSchema;
  
  // Simple restart: reload the page to avoid any schema conflicts
  logger.log(logger.LOG_LEVELS.DEBUG, "Reloading page to apply wheel count change...");
  window.location.reload();
}

function cw_cleanupAll() {
  // Clear existing UI elements created by cw_init
  try {
    // Clear car-related UI
    var carsElement = document.getElementById("cars");
    if (carsElement) {
      carsElement.innerHTML = "";
    }
    
    // Clear health container (but preserve template)
    var healthContainer = document.getElementById("health");
    if (healthContainer) {
      var healthBars = healthContainer.querySelectorAll('.healthbar:not([name])');
      for (var i = 0; i < healthBars.length; i++) {
        healthBars[i].remove();
      }
    }
    
    // Clear minimap markers (but preserve template)
    var minimapholder = document.getElementById("minimapholder");
    if (minimapholder) {
      var markers = minimapholder.querySelectorAll('[id^="bar"]:not([name])');
      for (var i = 0; i < markers.length; i++) {
        markers[i].remove();
      }
    }
    
    // Reset graphics
    if (typeof cw_clearGraphics === 'function') {
      cw_clearGraphics();
    }
  } catch (e) {
    console.error("Cleanup error:", e);
  }
}

// Dark mode functionality
function toggleTheme() {
  var currentTheme = document.documentElement.getAttribute('data-theme');
  var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  var toggleButton = document.getElementById('theme-toggle');
  
  document.documentElement.setAttribute('data-theme', newTheme);
  
  if (newTheme === 'dark') {
    toggleButton.textContent = '☀️ Light Mode';
    localStorage.setItem('theme', 'dark');
  } else {
    toggleButton.textContent = '🌙 Dark Mode';
    localStorage.setItem('theme', 'light');
  }
}

// Initialize theme from localStorage
function initializeTheme() {
  var savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark mode
  var toggleButton = document.getElementById('theme-toggle');
  
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  if (savedTheme === 'dark') {
    toggleButton.textContent = '☀️ Light Mode';
  } else {
    toggleButton.textContent = '🌙 Dark Mode';
  }
}

// Make functions available globally
window.toggleTheme = toggleTheme;
window.getCurrentLeaderGenome = function() {
  return currentLeaderGenome;
};
window.graphState = graphState;

cw_init();

// Initialize theme after page load
document.addEventListener('DOMContentLoaded', initializeTheme);

},{"./car-schema/construct.js":2,"./draw/draw-car-stats.js":5,"./draw/draw-car.js":6,"./draw/draw-floor.js":8,"./draw/draw-water.js":10,"./draw/plot-graphs.js":11,"./generation-config":15,"./genome-viewer.js":18,"./ghost/index.js":20,"./logger/logger.js":22,"./machine-learning/genetic-algorithm/manage-round.js":24,"./world/run.js":26}],22:[function(require,module,exports){
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
},{}],23:[function(require,module,exports){
var random = require("./random.js");

module.exports = {
  createGenerationZero(schema, generator){
    return Object.keys(schema).reduce(function(instance, key){
      var schemaProp = schema[key];
      var values = random.createNormals(schemaProp, generator);
      instance[key] = values;
      return instance;
    }, { id: Math.random().toString(32) });
  },
  createCrossBreed(schema, parents, parentChooser){
    var id = Math.random().toString(32);
    return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = parentChooser(id, key, parents);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
      return crossDef;
    }, {
      id: id,
      ancestry: parents.map(function(parent){
        return {
          id: parent.id,
          ancestry: parent.ancestry,
        };
      })
    });
  },
  createMutatedClone(schema, generator, parent, factor, chanceToMutate){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values = random.mutateNormals(
        schemaProp, generator, originalValues, factor, chanceToMutate
      );
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
  applyTypes(schema, parent){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values;
      switch(schemaProp.type){
        case "shuffle" :
          values = random.mapToShuffle(schemaProp, originalValues); break;
        case "float" :
          values = random.mapToFloat(schemaProp, originalValues); break;
        case "integer":
          values = random.mapToInteger(schemaProp, originalValues); break;
        default:
          throw new Error(`Unknown type ${schemaProp.type} of schema for key ${key}`);
      }
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
}

},{"./random.js":25}],24:[function(require,module,exports){
var create = require("../create-instance");

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration
}

function generationZero(config){
  var generationSize = config.generationSize,
  schema = config.schema;
  var cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = create.createGenerationZero(schema, function(){
      return Math.random()
    });
    def.index = k;
    cw_carGeneration.push(def);
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

function nextGeneration(
  previousState,
  scores,
  config
){
  var logger = require("../../logger/logger.js");
  logger.log(logger.LOG_LEVELS.DEBUG, "=== NEXT GENERATION STARTING ===");
  logger.log(logger.LOG_LEVELS.DEBUG, "Schema:", JSON.stringify(config.schema));
  logger.log(logger.LOG_LEVELS.DEBUG, "Generation size:", config.generationSize);
  
  var champion_length = config.championLength,
    generationSize = config.generationSize,
    selectFromAllParents = config.selectFromAllParents;

  var newGeneration = new Array();
  var newborn;
  logger.log(logger.LOG_LEVELS.DEBUG, "Adding", champion_length, "champions to new generation");
  for (var k = 0; k < champion_length; k++) {``
    scores[k].def.is_elite = true;
    scores[k].def.index = k;
    newGeneration.push(scores[k].def);
  }
  var parentList = [];
  for (k = champion_length; k < generationSize; k++) {
    var parent1 = selectFromAllParents(scores, parentList);
    var parent2 = parent1;
    while (parent2 == parent1) {
      parent2 = selectFromAllParents(scores, parentList, parent1);
    }
    var pair = [parent1, parent2]
    parentList.push(pair);
    newborn = makeChild(config,
      pair.map(function(parent) { return scores[parent].def; })
    );
    newborn = mutate(config, newborn);
    newborn.is_elite = false;
    newborn.index = k;
    newGeneration.push(newborn);
  }

  return {
    counter: previousState.counter + 1,
    generation: newGeneration,
  };
}


function makeChild(config, parents){
  var schema = config.schema,
    pickParent = config.pickParent;
  return create.createCrossBreed(schema, parents, pickParent)
}


function mutate(config, parent){
  var schema = config.schema,
    mutation_range = config.mutation_range,
    gen_mutation = config.gen_mutation,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    Math.max(mutation_range),
    gen_mutation
  )
}

},{"../../logger/logger.js":22,"../create-instance":23}],25:[function(require,module,exports){


const random = {
  shuffleIntegers(prop, generator){
    return random.mapToShuffle(prop, random.createNormals({
      length: prop.length || 10,
      inclusive: true,
    }, generator));
  },
  createIntegers(prop, generator){
    return random.mapToInteger(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createFloats(prop, generator){
    return random.mapToFloat(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createNormals(prop, generator){
    var l = prop.length;
    var values = [];
    for(var i = 0; i < l; i++){
      values.push(
        createNormal(prop, generator)
      );
    }
    return values;
  },
  mutateShuffle(
    prop, generator, originalValues, mutation_range, chanceToMutate
  ){
    return random.mapToShuffle(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateIntegers(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToInteger(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateFloats(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToFloat(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mapToShuffle(prop, normals){
    var offset = prop.offset || 0;
    var limit = prop.limit || prop.length;
    
    // Simple approach: just return the first 'limit' indices with offset
    var result = [];
    for (var i = 0; i < limit && i < prop.length; i++) {
      result.push(i + offset);
    }
    
    return result;
  },
  mapToInteger(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 10,
      length: prop.length
    }
    return random.mapToFloat(prop, normals).map(function(float){
      return Math.round(float);
    });
  },
  mapToFloat(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 1
    }
    return normals.map(function(normal){
      var min = prop.min;
      var range = prop.range;
      return min + normal * range
    })
  },
  mutateNormals(prop, generator, originalValues, mutation_range, chanceToMutate){
    var factor = (prop.factor || 1) * mutation_range
    return originalValues.map(function(originalValue){
      if(generator() > chanceToMutate){
        return originalValue;
      }
      return mutateNormal(
        prop, generator, originalValue, factor
      );
    });
  }
};

module.exports = random;

function mutateNormal(prop, generator, originalValue, mutation_range){
  if(mutation_range > 1){
    throw new Error("Cannot mutate beyond bounds");
  }
  var newMin = originalValue - 0.5;
  if (newMin < 0) newMin = 0;
  if (newMin + mutation_range  > 1)
    newMin = 1 - mutation_range;
  var rangeValue = createNormal({
    inclusive: true,
  }, generator);
  return newMin + rangeValue * mutation_range;
}

function createNormal(prop, generator){
  if(!prop.inclusive){
    return generator();
  } else {
    return generator() < 0.5 ?
    generator() :
    1 - generator();
  }
}

},{}],26:[function(require,module,exports){
/* globals btoa */
var setupScene = require("./setup-scene");
var carRun = require("../car-schema/run");
var defToCar = require("../car-schema/def-to-car");
var waterPhysics = require("./water-physics");
var logger = require("../logger/logger");

module.exports = runDefs;
function runDefs(world_def, defs, listeners) {
  // Initialize debug logger
  logger.init(logger.LOG_LEVELS.INFO);
  logger.log(logger.LOG_LEVELS.DEBUG, "Starting world with", defs.length, "cars");
  
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    world_def.floorseed = btoa(Math.seedrandom());
  }

  var scene = setupScene(world_def);
  scene.world.Step(1 / world_def.box2dfps, 15, 15);
  logger.log(logger.LOG_LEVELS.DEBUG, "about to build cars");
  
  // Log wheel count from first car definition
  if (defs.length > 0 && defs[0].wheel_radius) {
    logger.log(logger.LOG_LEVELS.DEBUG, "Building generation with", defs[0].wheel_radius.length, "wheels per car");
  }
  
  var cars = defs.map((def, i) => {
    logger.log(logger.LOG_LEVELS.DEBUG, "Building car", i, "with", def.wheel_radius ? def.wheel_radius.length : "unknown", "wheels");
    try {
      var carObj = defToCar(def, scene.world, world_def);
      logger.log(logger.LOG_LEVELS.DEBUG, "Car", i, "built successfully");
      return {
        index: i,
        def: def,
        car: carObj,
        state: carRun.getInitialState(world_def)
      };
    } catch (e) {
      logger.log(logger.LOG_LEVELS.ERROR, "Error building car", i, ":", e.message);
      throw e;
    }
  });
  logger.log(logger.LOG_LEVELS.DEBUG, "All cars built successfully");
  var alivecars = cars;
  
  // Function to find car info from body (handles dynamic wheel counts)
  function findCarFromBody(carBody) {
    for (var i = 0; i < cars.length; i++) {
      var car = cars[i];
      if (!car || !car.car) continue;
      
      // Check if it's the chassis
      if (car.car.chassis === carBody) {
        return {carIndex: car.index, type: 'chassis'};
      }
      
      // Check if it's one of the wheels
      for (var w = 0; w < car.car.wheels.length; w++) {
        if (car.car.wheels[w] === carBody) {
          return {carIndex: car.index, type: 'wheel', wheelIndex: w};
        }
      }
    }
    return null;
  }
  
  // Set up collision listener for water
  var collisionCount = 0;
  var maxCollisionsPerFrame = 10000; // Safety limit - further increased for 3+ wheels
  
  var listener = {
    BeginContact: function(contact) {
      var fixtureA = contact.GetFixtureA();
      var fixtureB = contact.GetFixtureB();
      
      // Early exit if neither fixture is water
      var userDataA = fixtureA.GetUserData();
      var userDataB = fixtureB.GetUserData();
      
      if ((!userDataA || userDataA.type !== "water") && 
          (!userDataB || userDataB.type !== "water")) {
        return; // Not a water collision, ignore it
      }
      
      logger.incrementCollisionEvents();
      collisionCount++;
      
      // Safety circuit breaker
      if (collisionCount > maxCollisionsPerFrame) {
        logger.log(logger.LOG_LEVELS.ERROR, "Too many collisions per frame! Ignoring collision", collisionCount);
        return;
      }
      
      var waterFixture = null;
      var carFixture = null;
      
      if (fixtureA.GetUserData() && fixtureA.GetUserData().type === "water") {
        waterFixture = fixtureA;
        carFixture = fixtureB;
      } else if (fixtureB.GetUserData() && fixtureB.GetUserData().type === "water") {
        waterFixture = fixtureB;
        carFixture = fixtureA;
      }
      
      if (waterFixture && carFixture) {
        logger.log(logger.LOG_LEVELS.DEBUG, "Water collision detected");
        
        // Use dynamic lookup to handle changing wheel counts
        var carBody = carFixture.GetBody();
        var carInfo = findCarFromBody(carBody);
        
        if (carInfo) {
          if (carInfo.type === 'chassis') {
            logger.log(logger.LOG_LEVELS.DEBUG, "Car", carInfo.carIndex, "chassis entered water");
            waterPhysics.registerCarPartInWater(carInfo.carIndex, "chassis", waterFixture.GetUserData());
          } else if (carInfo.type === 'wheel') {
            logger.log(logger.LOG_LEVELS.DEBUG, "Car", carInfo.carIndex, "wheel", carInfo.wheelIndex, "entered water");
            waterPhysics.registerCarPartInWater(carInfo.carIndex, "wheel" + carInfo.wheelIndex, waterFixture.GetUserData());
          }
        } else {
          logger.log(logger.LOG_LEVELS.DEBUG, "Water collision but couldn't find car for body");
        }
      }
    },
    EndContact: function(contact) {
      var fixtureA = contact.GetFixtureA();
      var fixtureB = contact.GetFixtureB();
      
      // Early exit if neither fixture is water
      var userDataA = fixtureA.GetUserData();
      var userDataB = fixtureB.GetUserData();
      
      if ((!userDataA || userDataA.type !== "water") && 
          (!userDataB || userDataB.type !== "water")) {
        return; // Not a water collision, ignore it
      }
      
      logger.incrementCollisionEvents();
      
      var waterFixture = null;
      var carFixture = null;
      
      if (fixtureA.GetUserData() && fixtureA.GetUserData().type === "water") {
        waterFixture = fixtureA;
        carFixture = fixtureB;
      } else if (fixtureB.GetUserData() && fixtureB.GetUserData().type === "water") {
        waterFixture = fixtureB;
        carFixture = fixtureA;
      }
      
      if (waterFixture && carFixture) {
        logger.log(logger.LOG_LEVELS.DEBUG, "Water exit detected");
        
        // Use dynamic lookup to handle changing wheel counts
        var carBody = carFixture.GetBody();
        var carInfo = findCarFromBody(carBody);
        
        if (carInfo) {
          if (carInfo.type === 'chassis') {
            logger.log(logger.LOG_LEVELS.DEBUG, "Car", carInfo.carIndex, "chassis exited water");
            waterPhysics.unregisterCarPartFromWater(carInfo.carIndex, "chassis");
          } else if (carInfo.type === 'wheel') {
            logger.log(logger.LOG_LEVELS.DEBUG, "Car", carInfo.carIndex, "wheel", carInfo.wheelIndex, "exited water");
            waterPhysics.unregisterCarPartFromWater(carInfo.carIndex, "wheel" + carInfo.wheelIndex);
          }
        } else {
          logger.log(logger.LOG_LEVELS.DEBUG, "Water exit but couldn't find car for body");
        }
      }
    },
    PreSolve: function() {},
    PostSolve: function() {}
  };
  
  scene.world.SetContactListener(listener);
  
  return {
    scene: scene,
    cars: cars,
    step: function () {
      logger.frameStart();
      logger.time("total-step");
      collisionCount = 0; // Reset collision counter each frame
      
      if (alivecars.length === 0) {
        throw new Error("no more cars");
      }
      
      // Apply water physics BEFORE physics step to avoid timing issues
      logger.time("water-physics");
      try {
        // Clear frame-level exit tracking at the start of each physics step
        waterPhysics.clearFrameExitTracking();
        
        var carsInWater = waterPhysics.getCarsInWater();
        logger.setCarsInWater(carsInWater.size);
        
        if (carsInWater.size > 0) {
          logger.log(logger.LOG_LEVELS.DEBUG, "Applying water forces to", carsInWater.size, "cars");
        }
        
        carsInWater.forEach(function(waterData, carIndex) {
          var car = cars[carIndex];
          if (car && car.car && carIndex < cars.length) {
            waterPhysics.applyWaterForces(car.car, waterData);
            logger.incrementWaterForces();
          } else {
            // Clean up invalid entries
            logger.log(logger.LOG_LEVELS.DEBUG, "Removing invalid car", carIndex, "from water registry");
            waterPhysics.unregisterCarFromWater(carIndex);
          }
        });
      } catch (e) {
        logger.log(logger.LOG_LEVELS.ERROR, "Error in water physics:", e);
      }
      logger.timeEnd("water-physics");
      
      logger.time("physics-step");
      scene.world.Step(1 / world_def.box2dfps, 15, 15);
      logger.timeEnd("physics-step");
      
      listeners.preCarStep();
      alivecars = alivecars.filter(function (car) {
        // Pass car index to the car for water detection
        car.car.carIndex = car.index;
        
        // GLOBAL FLYING CAR PREVENTION: Check all cars for excessive upward velocity
        if (car.car.chassis && car.car.chassis.IsActive()) {
          var velocity = car.car.chassis.GetLinearVelocity();
          if (velocity && velocity.y > 1.2) {
            // logger.log(logger.LOG_LEVELS.WARN, "GLOBAL: Car", car.index, "flying with velocity", velocity.y.toFixed(2), "- aggressive reset");
            
            // AGGRESSIVE RESET: Set downward velocity to break force equilibrium
            car.car.chassis.SetLinearVelocity(new b2Vec2(velocity.x, -0.5));
            car.car.chassis.SetAngularVelocity(0);
            
            // Also reset wheels to prevent joint forces
            if (car.car.wheels) {
              for (var w = 0; w < car.car.wheels.length; w++) {
                if (car.car.wheels[w] && car.car.wheels[w].IsActive()) {
                  var wheelVel = car.car.wheels[w].GetLinearVelocity();
                  car.car.wheels[w].SetLinearVelocity(new b2Vec2(wheelVel.x, -0.5));
                  car.car.wheels[w].SetAngularVelocity(0);
                }
              }
            }
            
            // Force remove from any water tracking
            waterPhysics.unregisterCarFromWater(car.index);
          }
        }
        
        car.state = carRun.updateState(
          world_def, car.car, car.state
        );
        var status = carRun.getStatus(car.state, world_def);
        listeners.carStep(car);
        if (status === 0) {
          return true;
        }
        car.score = carRun.calculateScore(car.state, world_def);
        listeners.carDeath(car);
        
        // Remove car from water tracking when it dies
        waterPhysics.unregisterCarFromWater(car.index);

        var world = scene.world;
        var worldCar = car.car;
        world.DestroyBody(worldCar.chassis);

        for (var w = 0; w < worldCar.wheels.length; w++) {
          world.DestroyBody(worldCar.wheels[w]);
        }

        return false;
      })
      if (alivecars.length === 0) {
        listeners.generationEnd(cars);
      }
      
      logger.timeEnd("total-step");
      logger.frameEnd();
    }
  }

}

},{"../car-schema/def-to-car":3,"../car-schema/run":4,"../logger/logger":22,"./setup-scene":27,"./water-physics":28}],27:[function(require,module,exports){
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

},{"../logger/logger":22,"./water-physics":28}],28:[function(require,module,exports){
/* globals b2Vec2 b2BodyDef b2FixtureDef b2PolygonShape */

var logger = require("../logger/logger");

module.exports = {
  createWaterZone: createWaterZone,
  applyWaterForces: applyWaterForces,
  isInWater: isInWater,
  clearFrameExitTracking: clearFrameExitTracking
};

var waterZones = [];
var carsInWater = new Map();
var carPartsInWater = new Map(); // Track which parts of each car are in water
var carReferences = new Map(); // Store car object references for force clearing
var carExitForces = new Map(); // Track accumulated forces to counter on exit
var carsJustExited = new Set(); // Track cars that just exited this frame
var waterPhysicsEnabled = true;
var errorCount = 0;
var maxErrors = 10;

function createWaterZone(world, position, width, depth) {
  // Create water sensor zone
  var water_body_def = new b2BodyDef();
  // Position water zone in the middle of the depth
  water_body_def.position.Set(position.x + width/2, position.y - depth/2);
  
  var water_body = world.CreateBody(water_body_def);
  var water_fix_def = new b2FixtureDef();
  water_fix_def.shape = new b2PolygonShape();
  water_fix_def.shape.SetAsBox(width/2, depth/2);
  water_fix_def.isSensor = true; // Water is a sensor, not solid
  water_fix_def.userData = { type: "water", depth: depth, width: width };
  
  water_body.CreateFixture(water_fix_def);
  
  // Create solid walls and floor
  var wallThickness = 0.2;
  
  // Left wall
  var left_wall_def = new b2BodyDef();
  left_wall_def.position.Set(position.x - wallThickness/2, position.y - depth/2);
  var left_wall = world.CreateBody(left_wall_def);
  var left_wall_fix = new b2FixtureDef();
  left_wall_fix.shape = new b2PolygonShape();
  left_wall_fix.shape.SetAsBox(wallThickness/2, depth/2 + 0.5); // Extra height above water
  left_wall_fix.friction = 0.3;
  left_wall.CreateFixture(left_wall_fix);
  
  // Right wall
  var right_wall_def = new b2BodyDef();
  right_wall_def.position.Set(position.x + width + wallThickness/2, position.y - depth/2);
  var right_wall = world.CreateBody(right_wall_def);
  var right_wall_fix = new b2FixtureDef();
  right_wall_fix.shape = new b2PolygonShape();
  right_wall_fix.shape.SetAsBox(wallThickness/2, depth/2 + 0.5);
  right_wall_fix.friction = 0.3;
  right_wall.CreateFixture(right_wall_fix);
  
  // Bottom floor
  var floor_def = new b2BodyDef();
  floor_def.position.Set(position.x + width/2, position.y - depth - wallThickness/2);
  var floor = world.CreateBody(floor_def);
  var floor_fix = new b2FixtureDef();
  floor_fix.shape = new b2PolygonShape();
  floor_fix.shape.SetAsBox(width/2 + wallThickness, wallThickness/2);
  floor_fix.friction = 0.5;
  floor.CreateFixture(floor_fix);
  
  var waterZone = {
    body: water_body,
    leftWall: left_wall,
    rightWall: right_wall,
    floor: floor,
    position: position,
    width: width,
    depth: depth,
    dragCoefficient: 0.5,
    buoyancyFactor: 0.15
  };
  
  waterZones.push(waterZone);
  return waterZone;
}

function applyWaterForces(car, waterData) {
  
  if (!waterPhysicsEnabled) {
    logger.log(logger.LOG_LEVELS.WARN, "Water physics disabled");
    return; // Water physics disabled due to errors
  }
  
  if (!car || !car.chassis || !car.wheels || !waterData) {
    logger.log(logger.LOG_LEVELS.WARN, "Missing car data:", !!car, !!(car && car.chassis), !!(car && car.wheels), !!waterData);
    return; // Safety check
  }
  
  // Double-check if car should still be in water
  if (!car.carIndex && car.carIndex !== 0) {
    logger.log(logger.LOG_LEVELS.WARN, "Car missing carIndex");
    return;
  }
  
  if (!carsInWater.has(car.carIndex)) {
    logger.log(logger.LOG_LEVELS.WARN, "Applying water forces to car", car.carIndex, "not in water registry");
    return;
  }
  
  // CRITICAL: Don't apply forces to cars that just exited this frame
  if (carsJustExited.has(car.carIndex)) {
    logger.log(logger.LOG_LEVELS.DEBUG, "Skipping water forces for car", car.carIndex, "that just exited");
    return;
  }
  
  var chassis = car.chassis;
  var wheels = car.wheels;
  
  // Store car reference for force clearing
  carReferences.set(car.carIndex, car);
  
  try {
    // Check if chassis is still valid (not destroyed)
    if (!chassis.IsActive()) {
      logger.log(logger.LOG_LEVELS.DEBUG, "Car", car.carIndex, "chassis is inactive, removing from water");
      unregisterCarFromWater(car.carIndex);
      return;
    }
    
    // VELOCITY-BASED WATER PHYSICS: Directly control velocity instead of applying forces
    var velocity = chassis.GetLinearVelocity();
    if (!velocity) return;
    
    // Simple approach: if sinking (negative Y velocity), give gentle upward velocity
    if (velocity.y < 0.5) {
      // Set gentle upward velocity for floating
      chassis.SetLinearVelocity(new b2Vec2(velocity.x, 0.5));
      logger.log(logger.LOG_LEVELS.DEBUG, "Car", car.carIndex, "set to float with velocity 0.5");
    }
    
    // Handle wheels with same approach
    for (var i = 0; i < wheels.length; i++) {
      var wheel = wheels[i];
      if (wheel && wheel.IsActive()) {
        var wheelVelocity = wheel.GetLinearVelocity();
        if (wheelVelocity && wheelVelocity.y < 0.3) {
          wheel.SetLinearVelocity(new b2Vec2(wheelVelocity.x, 0.3));
        }
      }
    }
    
  } catch (e) {
    errorCount++;
    logger.log(logger.LOG_LEVELS.ERROR, "Error applying water forces:", e, "Error count:", errorCount);
    
    if (errorCount >= maxErrors) {
      logger.log(logger.LOG_LEVELS.ERROR, "Too many water physics errors! Disabling water physics");
      waterPhysicsEnabled = false;
    }
  }
}

function isInWater(carId) {
  return carsInWater.has(carId);
}

function registerCarPartInWater(carId, partName, waterUserData) {
  if (!carPartsInWater.has(carId)) {
    carPartsInWater.set(carId, new Set());
  }
  
  var parts = carPartsInWater.get(carId);
  parts.add(partName);
  
  // Only register car in water if it wasn't already
  if (!carsInWater.has(carId)) {
    logger.log(logger.LOG_LEVELS.DEBUG, "Car", carId, "registered in water");
    carsInWater.set(carId, waterUserData);
  }
  
  logger.log(logger.LOG_LEVELS.DEBUG, "Car", carId, "part", partName, "entered water. Total parts in water:", parts.size);
}

function unregisterCarPartFromWater(carId, partName) {
  if (!carPartsInWater.has(carId)) {
    logger.log(logger.LOG_LEVELS.DEBUG, "Tried to unregister part", partName, "from car", carId, "but car has no parts in water");
    return;
  }
  
  var parts = carPartsInWater.get(carId);
  parts.delete(partName);
  
  logger.log(logger.LOG_LEVELS.DEBUG, "Car", carId, "part", partName, "exited water. Remaining parts in water:", parts.size);
  
  // IMMEDIATE CLEANUP: Remove car from water tracking immediately when any major part exits
  if (partName === "chassis" || parts.size === 0) {
    logger.log(logger.LOG_LEVELS.DEBUG, "Car", carId, "exiting water (chassis or all parts out) - immediate cleanup");
    
    // Immediate removal from all tracking
    carsInWater.delete(carId);
    carPartsInWater.delete(carId);
    carsJustExited.add(carId);
    
    // CRITICAL: Immediately clear forces and reset velocity
    clearCarForces(carId);
    
    logger.log(logger.LOG_LEVELS.DEBUG, "Car", carId, "completely removed from water tracking");
  }
}

// Keep old functions for compatibility but redirect to new ones
function registerCarInWater(carId, waterUserData) {
  registerCarPartInWater(carId, "unknown", waterUserData);
}

function unregisterCarFromWater(carId) {
  // Force unregister all parts
  if (carPartsInWater.has(carId)) {
    carPartsInWater.delete(carId);
  }
  if (carsInWater.has(carId)) {
    carsInWater.delete(carId);
  }
  clearCarForces(carId);
}

function clearCarForces(carId) {
  var carRef = carReferences.get(carId);
  if (carRef && carRef.chassis && carRef.chassis.IsActive()) {
    try {
      var velocity = carRef.chassis.GetLinearVelocity();
      
      // SIMPLE EXIT: Just let gravity work naturally, no special forces
      if (velocity) {
        // Only reset to zero if floating up, otherwise let gravity work
        if (velocity.y > 0) {
          carRef.chassis.SetLinearVelocity(new b2Vec2(velocity.x, 0));
          logger.log(logger.LOG_LEVELS.DEBUG, "Car", carId, "upward velocity reset to 0 on exit");
        }
        carRef.chassis.SetAngularVelocity(0);
      }
      
      // Reset wheel velocities similarly
      if (carRef.wheels) {
        for (var i = 0; i < carRef.wheels.length; i++) {
          var wheel = carRef.wheels[i];
          if (wheel && wheel.IsActive()) {
            var wheelVel = wheel.GetLinearVelocity();
            if (wheelVel && wheelVel.y > 0) {
              wheel.SetLinearVelocity(new b2Vec2(wheelVel.x, 0));
            }
            wheel.SetAngularVelocity(0);
          }
        }
      }
      
      // Clear accumulated force tracking
      if (carExitForces.has(carId)) {
        carExitForces.delete(carId);
      }
      
      logger.log(logger.LOG_LEVELS.DEBUG, "Car", carId, "water exit - velocity normalized");
    } catch (e) {
      logger.log(logger.LOG_LEVELS.ERROR, "Error clearing forces for car", carId, ":", e);
    }
  }
  
  carReferences.delete(carId);
}

function clearFrameExitTracking() {
  // Clear the set of cars that exited this frame - called at the start of each physics step
  carsJustExited.clear();
}

// Export internal functions for collision handling
module.exports.registerCarInWater = registerCarInWater;
module.exports.unregisterCarFromWater = unregisterCarFromWater;
module.exports.registerCarPartInWater = registerCarPartInWater;
module.exports.unregisterCarPartFromWater = unregisterCarPartFromWater;
module.exports.getWaterZones = function() { return waterZones; };
module.exports.getCarsInWater = function() { return carsInWater; };
module.exports.clearWaterZones = function() { 
  waterZones = [];
  carsInWater.clear();
  carPartsInWater.clear();
  carReferences.clear();
  carExitForces.clear();
  carsJustExited.clear();
  waterPhysicsEnabled = true;
  errorCount = 0;
  logger.log(logger.LOG_LEVELS.DEBUG, "Water zones cleared, physics re-enabled");
};
},{"../logger/logger":22}]},{},[21])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2FyLXNjaGVtYS9jYXItY29uc3RhbnRzLmpzb24iLCJzcmMvY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanMiLCJzcmMvY2FyLXNjaGVtYS9kZWYtdG8tY2FyLmpzIiwic3JjL2Nhci1zY2hlbWEvcnVuLmpzIiwic3JjL2RyYXcvZHJhdy1jYXItc3RhdHMuanMiLCJzcmMvZHJhdy9kcmF3LWNhci5qcyIsInNyYy9kcmF3L2RyYXctY2lyY2xlLmpzIiwic3JjL2RyYXcvZHJhdy1mbG9vci5qcyIsInNyYy9kcmF3L2RyYXctdmlydHVhbC1wb2x5LmpzIiwic3JjL2RyYXcvZHJhdy13YXRlci5qcyIsInNyYy9kcmF3L3Bsb3QtZ3JhcGhzLmpzIiwic3JjL2RyYXcvc2NhdHRlci1wbG90LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2dlbmVyYXRlUmFuZG9tLmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luYnJlZWRpbmctY29lZmZpY2llbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5kZXguanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvcGlja1BhcmVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9zZWxlY3RGcm9tQWxsUGFyZW50cy5qcyIsInNyYy9nZW5vbWUtdmlld2VyLmpzIiwic3JjL2dob3N0L2Nhci10by1naG9zdC5qcyIsInNyYy9naG9zdC9pbmRleC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy9sb2dnZXIvbG9nZ2VyLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvcmFuZG9tLmpzIiwic3JjL3dvcmxkL3J1bi5qcyIsInNyYy93b3JsZC9zZXR1cC1zY2VuZS5qcyIsInNyYy93b3JsZC93YXRlci1waHlzaWNzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3o4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIndoZWVsQ291bnRcIjogMixcbiAgXCJ3aGVlbE1pblJhZGl1c1wiOiAwLjIsXG4gIFwid2hlZWxSYWRpdXNSYW5nZVwiOiAwLjUsXG4gIFwid2hlZWxNaW5EZW5zaXR5XCI6IDQwLFxuICBcIndoZWVsRGVuc2l0eVJhbmdlXCI6IDEwMCxcbiAgXCJjaGFzc2lzRGVuc2l0eVJhbmdlXCI6IDMwMCxcbiAgXCJjaGFzc2lzTWluRGVuc2l0eVwiOiAzMCxcbiAgXCJjaGFzc2lzTWluQXhpc1wiOiAwLjEsXG4gIFwiY2hhc3Npc0F4aXNSYW5nZVwiOiAxLjFcbn1cbiIsInZhciBjYXJDb25zdGFudHMgPSByZXF1aXJlKFwiLi9jYXItY29uc3RhbnRzLmpzb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB3b3JsZERlZjogd29ybGREZWYsXG4gIGNhckNvbnN0YW50czogZ2V0Q2FyQ29uc3RhbnRzLFxuICBnZW5lcmF0ZVNjaGVtYTogZ2VuZXJhdGVTY2hlbWFcbn1cblxuZnVuY3Rpb24gd29ybGREZWYoKXtcbiAgdmFyIGJveDJkZnBzID0gNjA7XG4gIHJldHVybiB7XG4gICAgZ3Jhdml0eTogeyB5OiAwIH0sXG4gICAgZG9TbGVlcDogdHJ1ZSxcbiAgICBmbG9vcnNlZWQ6IFwiYWJjXCIsXG4gICAgbWF4Rmxvb3JUaWxlczogMjAwLFxuICAgIG11dGFibGVfZmxvb3I6IGZhbHNlLFxuICAgIG1vdG9yU3BlZWQ6IDIwLFxuICAgIGJveDJkZnBzOiBib3gyZGZwcyxcbiAgICBtYXhfY2FyX2hlYWx0aDogYm94MmRmcHMgKiAxMCxcbiAgICB0aWxlRGltZW5zaW9uczoge1xuICAgICAgd2lkdGg6IDEuNSxcbiAgICAgIGhlaWdodDogMC4xNVxuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2FyQ29uc3RhbnRzKCl7XG4gIHJldHVybiBjYXJDb25zdGFudHM7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlU2NoZW1hKHZhbHVlcyl7XG4gIHJldHVybiB7XG4gICAgd2hlZWxfcmFkaXVzOiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IHZhbHVlcy53aGVlbENvdW50LFxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5SYWRpdXMsXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsUmFkaXVzUmFuZ2UsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICB3aGVlbF9kZW5zaXR5OiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IHZhbHVlcy53aGVlbENvdW50LFxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5EZW5zaXR5LFxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbERlbnNpdHlSYW5nZSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIGNoYXNzaXNfZGVuc2l0eToge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiAxLFxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc0RlbnNpdHlSYW5nZSxcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc01pbkRlbnNpdHksXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICB2ZXJ0ZXhfbGlzdDoge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiAxMixcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNNaW5BeGlzLFxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzQXhpc1JhbmdlLFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgd2hlZWxfdmVydGV4OiB7XG4gICAgICB0eXBlOiBcInNodWZmbGVcIixcbiAgICAgIGxlbmd0aDogOCxcbiAgICAgIGxpbWl0OiB2YWx1ZXMud2hlZWxDb3VudCxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICB9O1xufVxuIiwiLypcbiAgZ2xvYmFscyBiMlJldm9sdXRlSm9pbnREZWYgYjJWZWMyIGIyQm9keURlZiBiMkJvZHkgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlIGIyQ2lyY2xlU2hhcGVcbiovXG5cbnZhciBjcmVhdGVJbnN0YW5jZSA9IHJlcXVpcmUoXCIuLi9tYWNoaW5lLWxlYXJuaW5nL2NyZWF0ZS1pbnN0YW5jZVwiKTtcbnZhciBsb2dnZXIgPSByZXF1aXJlKFwiLi4vbG9nZ2VyL2xvZ2dlclwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWZUb0NhcjtcblxuZnVuY3Rpb24gZGVmVG9DYXIobm9ybWFsX2RlZiwgd29ybGQsIGNvbnN0YW50cyl7XG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiZGVmVG9DYXI6IFN0YXJ0aW5nIGNhciBjb25zdHJ1Y3Rpb25cIik7XG4gIHZhciBjYXJfZGVmID0gY3JlYXRlSW5zdGFuY2UuYXBwbHlUeXBlcyhjb25zdGFudHMuc2NoZW1hLCBub3JtYWxfZGVmKVxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiBDYXIgZGVmIGNyZWF0ZWQsIHdoZWVsIGNvdW50OlwiLCBjYXJfZGVmLndoZWVsX3JhZGl1cy5sZW5ndGgpO1xuICBcbiAgdmFyIGluc3RhbmNlID0ge307XG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxuICAgIHdvcmxkLCBjYXJfZGVmLnZlcnRleF9saXN0LCBjYXJfZGVmLmNoYXNzaXNfZGVuc2l0eVxuICApO1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiBDaGFzc2lzIGNyZWF0ZWRcIik7XG4gIHZhciBpO1xuXG4gIHZhciB3aGVlbENvdW50ID0gY2FyX2RlZi53aGVlbF9yYWRpdXMubGVuZ3RoO1xuXG4gIGluc3RhbmNlLndoZWVscyA9IFtdO1xuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJkZWZUb0NhcjogQ3JlYXRpbmcgd2hlZWxcIiwgaSk7XG4gICAgaW5zdGFuY2Uud2hlZWxzW2ldID0gY3JlYXRlV2hlZWwoXG4gICAgICB3b3JsZCxcbiAgICAgIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldLFxuICAgICAgY2FyX2RlZi53aGVlbF9kZW5zaXR5W2ldXG4gICAgKTtcbiAgfVxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiBBbGxcIiwgd2hlZWxDb3VudCwgXCJ3aGVlbHMgY3JlYXRlZFwiKTtcblxuICB2YXIgY2FybWFzcyA9IGluc3RhbmNlLmNoYXNzaXMuR2V0TWFzcygpO1xuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgY2FybWFzcyArPSBpbnN0YW5jZS53aGVlbHNbaV0uR2V0TWFzcygpO1xuICB9XG5cbiAgdmFyIGpvaW50X2RlZiA9IG5ldyBiMlJldm9sdXRlSm9pbnREZWYoKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJkZWZUb0NhcjogQ3JlYXRpbmcgd2hlZWwgam9pbnRzXCIpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiBDcmVhdGluZyBqb2ludCBmb3Igd2hlZWxcIiwgaSk7XG4gICAgdmFyIHRvcnF1ZSA9IGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSAvIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldO1xuXG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJkZWZUb0Nhcjogd2hlZWxfdmVydGV4W1wiICsgaSArIFwiXSA9XCIsIGNhcl9kZWYud2hlZWxfdmVydGV4W2ldKTtcbiAgICBpZiAoY2FyX2RlZi53aGVlbF92ZXJ0ZXhbaV0gPj0gaW5zdGFuY2UuY2hhc3Npcy52ZXJ0ZXhfbGlzdC5sZW5ndGgpIHtcbiAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuRVJST1IsIFwiRVJST1I6IHdoZWVsX3ZlcnRleCBpbmRleCBvdXQgb2YgYm91bmRzIVwiLCBjYXJfZGVmLndoZWVsX3ZlcnRleFtpXSwgXCI+PVwiLCBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0Lmxlbmd0aCk7XG4gICAgfVxuICAgIFxuICAgIHZhciByYW5kdmVydGV4ID0gaW5zdGFuY2UuY2hhc3Npcy52ZXJ0ZXhfbGlzdFtjYXJfZGVmLndoZWVsX3ZlcnRleFtpXV07XG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQS5TZXQocmFuZHZlcnRleC54LCByYW5kdmVydGV4LnkpO1xuICAgIGpvaW50X2RlZi5sb2NhbEFuY2hvckIuU2V0KDAsIDApO1xuICAgIGpvaW50X2RlZi5tYXhNb3RvclRvcnF1ZSA9IHRvcnF1ZTtcbiAgICBqb2ludF9kZWYubW90b3JTcGVlZCA9IC1jb25zdGFudHMubW90b3JTcGVlZDtcbiAgICBqb2ludF9kZWYuZW5hYmxlTW90b3IgPSB0cnVlO1xuICAgIGpvaW50X2RlZi5ib2R5QSA9IGluc3RhbmNlLmNoYXNzaXM7XG4gICAgam9pbnRfZGVmLmJvZHlCID0gaW5zdGFuY2Uud2hlZWxzW2ldO1xuICAgIHdvcmxkLkNyZWF0ZUpvaW50KGpvaW50X2RlZik7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJkZWZUb0NhcjogSm9pbnQgY3JlYXRlZCBmb3Igd2hlZWxcIiwgaSk7XG4gIH1cbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJkZWZUb0NhcjogQWxsIGpvaW50cyBjcmVhdGVkXCIpO1xuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npcyh3b3JsZCwgdmVydGV4cywgZGVuc2l0eSkge1xuXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1swXSwgMCkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxXSwgdmVydGV4c1syXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbNF0sIHZlcnRleHNbNV0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzZdLCAwKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIC12ZXJ0ZXhzWzldKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzEwXSwgLXZlcnRleHNbMTFdKSk7XG5cbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xuXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XG5cbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMF0sIHZlcnRleF9saXN0WzFdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMV0sIHZlcnRleF9saXN0WzJdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbM10sIHZlcnRleF9saXN0WzRdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNF0sIHZlcnRleF9saXN0WzVdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNl0sIHZlcnRleF9saXN0WzddLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbN10sIHZlcnRleF9saXN0WzBdLCBkZW5zaXR5KTtcblxuICBib2R5LnZlcnRleF9saXN0ID0gdmVydGV4X2xpc3Q7XG5cbiAgcmV0dXJuIGJvZHk7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4MSwgdmVydGV4MiwgZGVuc2l0eSkge1xuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgxKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgyKTtcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxMDtcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkodmVydGV4X2xpc3QsIDMpO1xuXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIGJvZHlfZGVmLnR5cGUgPSBiMkJvZHkuYjJfZHluYW1pY0JvZHk7XG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcblxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUocmFkaXVzKTtcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDE7XG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuIiwidmFyIHdhdGVyUGh5c2ljcyA9IHJlcXVpcmUoXCIuLi93b3JsZC93YXRlci1waHlzaWNzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2V0SW5pdGlhbFN0YXRlOiBnZXRJbml0aWFsU3RhdGUsXG4gIHVwZGF0ZVN0YXRlOiB1cGRhdGVTdGF0ZSxcbiAgZ2V0U3RhdHVzOiBnZXRTdGF0dXMsXG4gIGNhbGN1bGF0ZVNjb3JlOiBjYWxjdWxhdGVTY29yZSxcbn07XG5cbmZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSh3b3JsZF9kZWYpe1xuICByZXR1cm4ge1xuICAgIGZyYW1lczogMCxcbiAgICBoZWFsdGg6IHdvcmxkX2RlZi5tYXhfY2FyX2hlYWx0aCxcbiAgICBtYXhQb3NpdGlvbnk6IDAsXG4gICAgbWluUG9zaXRpb255OiAwLFxuICAgIG1heFBvc2l0aW9ueDogMCxcbiAgICBmcmFtZXNJbldhdGVyOiAwLFxuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZShjb25zdGFudHMsIHdvcmxkQ29uc3RydWN0LCBzdGF0ZSl7XG4gIGlmKHN0YXRlLmhlYWx0aCA8PSAwKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBbHJlYWR5IERlYWRcIik7XG4gIH1cbiAgaWYoc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpe1xuICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgRmluaXNoZWRcIik7XG4gIH1cblxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZSk7XG4gIC8vIGNoZWNrIGhlYWx0aFxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XG4gIC8vIGNoZWNrIGlmIGNhciByZWFjaGVkIGVuZCBvZiB0aGUgcGF0aFxuICB2YXIgbmV4dFN0YXRlID0ge1xuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcbiAgICBtYXhQb3NpdGlvbng6IHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggPyBwb3NpdGlvbi54IDogc3RhdGUubWF4UG9zaXRpb254LFxuICAgIG1heFBvc2l0aW9ueTogcG9zaXRpb24ueSA+IHN0YXRlLm1heFBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5tYXhQb3NpdGlvbnksXG4gICAgbWluUG9zaXRpb255OiBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueVxuICB9O1xuXG4gIGlmIChwb3NpdGlvbi54ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpIHtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG5cbiAgaWYgKHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggKyAwLjAyKSB7XG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcbiAgICBuZXh0U3RhdGUuZnJhbWVzSW5XYXRlciA9IDA7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfVxuICBcbiAgLy8gQ2hlY2sgaWYgY2FyIGlzIGluIHdhdGVyXG4gIHZhciBjYXJJbmRleCA9IHdvcmxkQ29uc3RydWN0LmNhckluZGV4IHx8IDA7IC8vIE5lZWQgdG8gcGFzcyBjYXIgaW5kZXggZnJvbSB3b3JsZC9ydW4uanNcbiAgdmFyIGlzSW5XYXRlciA9IHdhdGVyUGh5c2ljcy5pc0luV2F0ZXIoY2FySW5kZXgpO1xuICBcbiAgaWYgKGlzSW5XYXRlcikge1xuICAgIG5leHRTdGF0ZS5mcmFtZXNJbldhdGVyID0gc3RhdGUuZnJhbWVzSW5XYXRlciArIDE7XG4gICAgLy8gTG9zZSBoZWFsdGggc2xpZ2h0bHkgZmFzdGVyIGluIHdhdGVyLCBidXQgbm90IHRvbyBtdWNoXG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IHN0YXRlLmhlYWx0aCAtIDI7IC8vIFJlZHVjZWQgZnJvbSAtMyB0byAtMlxuICAgIFxuICAgIC8vIEV4dHJhIHBlbmFsdHkgZm9yIGJlaW5nIHN0dWNrIGluIHdhdGVyIHRvbyBsb25nIChidXQgb25seSBhZnRlciBsb25nZXIgdGltZSlcbiAgICBpZiAobmV4dFN0YXRlLmZyYW1lc0luV2F0ZXIgPiAxODApIHsgLy8gTW9yZSB0aGFuIDMgc2Vjb25kcyBhdCA2MGZwcyAod2FzIDEgc2Vjb25kKVxuICAgICAgbmV4dFN0YXRlLmhlYWx0aCAtPSAxOyAvLyBSZWR1Y2VkIGZyb20gLTIgdG8gLTFcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbmV4dFN0YXRlLmZyYW1lc0luV2F0ZXIgPSAwO1xuICAgIG5leHRTdGF0ZS5oZWFsdGggPSBzdGF0ZS5oZWFsdGggLSAxO1xuICB9XG4gIFxuICBpZiAoTWF0aC5hYnMod29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpLngpIDwgMC4wMDEpIHtcbiAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDU7XG4gIH1cbiAgcmV0dXJuIG5leHRTdGF0ZTtcbn1cblxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXRlLCBjb25zdGFudHMpe1xuICBpZihoYXNGYWlsZWQoc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAtMTtcbiAgaWYoaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIDE7XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBoYXNGYWlsZWQoc3RhdGUgLyosIGNvbnN0YW50cyAqLyl7XG4gIHJldHVybiBzdGF0ZS5oZWFsdGggPD0gMDtcbn1cbmZ1bmN0aW9uIGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cyl7XG4gIHJldHVybiBzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZTtcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlU2NvcmUoc3RhdGUsIGNvbnN0YW50cyl7XG4gIHZhciBhdmdzcGVlZCA9IChzdGF0ZS5tYXhQb3NpdGlvbnggLyBzdGF0ZS5mcmFtZXMpICogY29uc3RhbnRzLmJveDJkZnBzO1xuICB2YXIgcG9zaXRpb24gPSBzdGF0ZS5tYXhQb3NpdGlvbng7XG4gIHZhciBzY29yZSA9IHBvc2l0aW9uICsgYXZnc3BlZWQ7XG4gIFxuICAvLyBCb251cyBmb3Igc3VjY2Vzc2Z1bGx5IGNyb3NzaW5nIHdhdGVyIChzcGVudCB0aW1lIGluIHdhdGVyIGJ1dCBkaWRuJ3QgZGllKVxuICBpZiAoc3RhdGUuZnJhbWVzSW5XYXRlciA+IDAgJiYgc3RhdGUuaGVhbHRoID4gMCkge1xuICAgIHNjb3JlICs9IDU7IC8vIFNtYWxsIGJvbnVzIGZvciB3YXRlciBzdXJ2aXZhbFxuICB9XG4gIFxuICByZXR1cm4ge1xuICAgIHY6IHNjb3JlLFxuICAgIHM6IGF2Z3NwZWVkLFxuICAgIHg6IHBvc2l0aW9uLFxuICAgIHk6IHN0YXRlLm1heFBvc2l0aW9ueSxcbiAgICB5Mjogc3RhdGUubWluUG9zaXRpb255XG4gIH1cbn1cbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgKi9cblxudmFyIHJ1biA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL3J1blwiKTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09IENhciA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xudmFyIGN3X0NhciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fX2NvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbmN3X0Nhci5wcm90b3R5cGUuX19jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChjYXIpIHtcbiAgdGhpcy5jYXIgPSBjYXI7XG4gIHRoaXMuY2FyX2RlZiA9IGNhci5kZWY7XG4gIHZhciBjYXJfZGVmID0gdGhpcy5jYXJfZGVmO1xuXG4gIHRoaXMuZnJhbWVzID0gMDtcbiAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gIHRoaXMuaXNfZWxpdGUgPSBjYXIuZGVmLmlzX2VsaXRlO1xuICB0aGlzLmhlYWx0aEJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIgKyBjYXJfZGVmLmluZGV4KS5zdHlsZTtcbiAgdGhpcy5oZWFsdGhCYXJUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xuICB0aGlzLmhlYWx0aEJhclRleHQuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcbiAgdGhpcy5taW5pbWFwbWFya2VyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYXJcIiArIGNhcl9kZWYuaW5kZXgpO1xuXG4gIGlmICh0aGlzLmlzX2VsaXRlKSB7XG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjM0Y3MkFGXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjM0Y3MkFGXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjRjdDODczXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjRjdDODczXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XG4gIH1cblxufVxuXG5jd19DYXIucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5jYXIuY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcbn1cblxuY3dfQ2FyLnByb3RvdHlwZS5raWxsID0gZnVuY3Rpb24gKGN1cnJlbnRSdW5uZXIsIGNvbnN0YW50cykge1xuICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcbiAgdmFyIGZpbmlzaExpbmUgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZpbmlzaExpbmVcbiAgdmFyIG1heF9jYXJfaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xuICB2YXIgc3RhdHVzID0gcnVuLmdldFN0YXR1cyh0aGlzLmNhci5zdGF0ZSwge1xuICAgIGZpbmlzaExpbmU6IGZpbmlzaExpbmUsXG4gICAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxuICB9KVxuICBzd2l0Y2goc3RhdHVzKXtcbiAgICBjYXNlIDE6IHtcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XG4gICAgICBicmVha1xuICAgIH1cbiAgICBjYXNlIC0xOiB7XG4gICAgICB0aGlzLmhlYWx0aEJhclRleHQuaW5uZXJIVE1MID0gXCImZGFnZ2VyO1wiO1xuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHRoaXMuYWxpdmUgPSBmYWxzZTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGN3X0NhcjtcbiIsIlxudmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xudmFyIGN3X2RyYXdDaXJjbGUgPSByZXF1aXJlKFwiLi9kcmF3LWNpcmNsZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXJfY29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpe1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG5cbiAgdmFyIHdoZWVsTWluRGVuc2l0eSA9IGNhcl9jb25zdGFudHMud2hlZWxNaW5EZW5zaXR5XG4gIHZhciB3aGVlbERlbnNpdHlSYW5nZSA9IGNhcl9jb25zdGFudHMud2hlZWxEZW5zaXR5UmFuZ2VcblxuICBpZiAoIW15Q2FyLmFsaXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBteUNhclBvcyA9IG15Q2FyLmdldFBvc2l0aW9uKCk7XG5cbiAgaWYgKG15Q2FyUG9zLnggPCAoY2FtZXJhX3ggLSA1KSkge1xuICAgIC8vIHRvbyBmYXIgYmVoaW5kLCBkb24ndCBkcmF3XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjNDQ0XCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcblxuICB2YXIgd2hlZWxzID0gbXlDYXIuY2FyLmNhci53aGVlbHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYiA9IHdoZWVsc1tpXTtcbiAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xuICAgICAgdmFyIGNvbG9yID0gTWF0aC5yb3VuZCgyNTUgLSAoMjU1ICogKGYubV9kZW5zaXR5IC0gd2hlZWxNaW5EZW5zaXR5KSkgLyB3aGVlbERlbnNpdHlSYW5nZSkudG9TdHJpbmcoKTtcbiAgICAgIHZhciByZ2Jjb2xvciA9IFwicmdiKFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIsXCIgKyBjb2xvciArIFwiKVwiO1xuICAgICAgY3dfZHJhd0NpcmNsZShjdHgsIGIsIHMubV9wLCBzLm1fcmFkaXVzLCBiLm1fc3dlZXAuYSwgcmdiY29sb3IpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChteUNhci5pc19lbGl0ZSkge1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNEQkUyRUZcIjtcbiAgfSBlbHNlIHtcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNGN0M4NzNcIjtcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjRkFFQkNEXCI7XG4gIH1cbiAgY3R4LmJlZ2luUGF0aCgpO1xuXG4gIHZhciBjaGFzc2lzID0gbXlDYXIuY2FyLmNhci5jaGFzc2lzO1xuXG4gIGZvciAoZiA9IGNoYXNzaXMuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XG4gICAgdmFyIGNzID0gZi5HZXRTaGFwZSgpO1xuICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGNoYXNzaXMsIGNzLm1fdmVydGljZXMsIGNzLm1fdmVydGV4Q291bnQpO1xuICB9XG4gIGN0eC5maWxsKCk7XG4gIGN0eC5zdHJva2UoKTtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBjd19kcmF3Q2lyY2xlO1xuXG5mdW5jdGlvbiBjd19kcmF3Q2lyY2xlKGN0eCwgYm9keSwgY2VudGVyLCByYWRpdXMsIGFuZ2xlLCBjb2xvcikge1xuICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludChjZW50ZXIpO1xuICBjdHguZmlsbFN0eWxlID0gY29sb3I7XG5cbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKHAueCwgcC55LCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcblxuICBjdHgubW92ZVRvKHAueCwgcC55KTtcbiAgY3R4LmxpbmVUbyhwLnggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSksIHAueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XG5cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xudmFyIGxvZ2dlciA9IHJlcXVpcmUoXCIuLi9sb2dnZXIvbG9nZ2VyXCIpO1xuXG52YXIgbGFzdExvZ2dlZFRpbGVDb3VudCA9IC0xO1xudmFyIGZyYW1lc1NpbmNlTGFzdExvZyA9IDA7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4LCBjYW1lcmEsIGN3X2Zsb29yVGlsZXMpIHtcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMwMDBcIjtcbiAgY3R4LmZpbGxTdHlsZSA9IFwiIzc3N1wiO1xuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XG4gIGN0eC5iZWdpblBhdGgoKTtcblxuICB2YXIgaztcbiAgaWYoY2FtZXJhLnBvcy54IC0gMTAgPiAwKXtcbiAgICBrID0gTWF0aC5mbG9vcigoY2FtZXJhLnBvcy54IC0gMTApIC8gMS41KTtcbiAgfSBlbHNlIHtcbiAgICBrID0gMDtcbiAgfVxuXG4gIC8vIExvZyBldmVyeSA2MCBmcmFtZXMgb3Igd2hlbiB0aWxlIGNvdW50IGNoYW5nZXNcbiAgZnJhbWVzU2luY2VMYXN0TG9nKys7XG4gIGlmIChmcmFtZXNTaW5jZUxhc3RMb2cgPiA2MCB8fCBsYXN0TG9nZ2VkVGlsZUNvdW50ICE9PSBjd19mbG9vclRpbGVzLmxlbmd0aCkge1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiRmxvb3IgcmVuZGVyaW5nIC0gQ2FtZXJhIFg6XCIsIGNhbWVyYV94LnRvRml4ZWQoMiksIFxuICAgICAgXCJTdGFydGluZyB0aWxlIGluZGV4OlwiLCBrLCBcIlRvdGFsIHRpbGVzOlwiLCBjd19mbG9vclRpbGVzLmxlbmd0aCk7XG4gICAgbGFzdExvZ2dlZFRpbGVDb3VudCA9IGN3X2Zsb29yVGlsZXMubGVuZ3RoO1xuICAgIGZyYW1lc1NpbmNlTGFzdExvZyA9IDA7XG4gIH1cblxuICB2YXIgdGlsZXNSZW5kZXJlZCA9IDA7XG4gIHZhciBsYXN0VGlsZVBvc2l0aW9uID0gMDtcblxuICBvdXRlcl9sb29wOlxuICAgIGZvciAoazsgayA8IGN3X2Zsb29yVGlsZXMubGVuZ3RoOyBrKyspIHtcbiAgICAgIHZhciBiID0gY3dfZmxvb3JUaWxlc1trXTtcbiAgICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xuICAgICAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcbiAgICAgICAgdmFyIHNoYXBlUG9zaXRpb24gPSBiLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzWzBdKS54O1xuICAgICAgICBsYXN0VGlsZVBvc2l0aW9uID0gc2hhcGVQb3NpdGlvbjtcbiAgICAgICAgaWYgKChzaGFwZVBvc2l0aW9uID4gKGNhbWVyYV94IC0gNSkpICYmIChzaGFwZVBvc2l0aW9uIDwgKGNhbWVyYV94ICsgMTApKSkge1xuICAgICAgICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGIsIHMubV92ZXJ0aWNlcywgcy5tX3ZlcnRleENvdW50KTtcbiAgICAgICAgICB0aWxlc1JlbmRlcmVkKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNoYXBlUG9zaXRpb24gPiBjYW1lcmFfeCArIDEwKSB7XG4gICAgICAgICAgYnJlYWsgb3V0ZXJfbG9vcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBcbiAgLy8gTG9nIHdoZW4gYXBwcm9hY2hpbmcgZW5kIG9mIHRpbGVzXG4gIGlmIChrID49IGN3X2Zsb29yVGlsZXMubGVuZ3RoIC0gMTApIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLklORk8sIFwiQXBwcm9hY2hpbmcgZW5kIG9mIGZsb29yIHRpbGVzISBDYW1lcmEgWDpcIiwgY2FtZXJhX3gudG9GaXhlZCgyKSwgXG4gICAgICBcIkxhc3QgdGlsZSBpbmRleDpcIiwgaywgXCJMYXN0IHRpbGUgWDpcIiwgbGFzdFRpbGVQb3NpdGlvbi50b0ZpeGVkKDIpKTtcbiAgfVxuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlKCk7XG59XG4iLCJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgsIGJvZHksIHZ0eCwgbl92dHgpIHtcbiAgLy8gc2V0IHN0cm9rZXN0eWxlIGFuZCBmaWxsc3R5bGUgYmVmb3JlIGNhbGxcbiAgLy8gY2FsbCBiZWdpblBhdGggYmVmb3JlIGNhbGxcblxuICB2YXIgcDAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4WzBdKTtcbiAgY3R4Lm1vdmVUbyhwMC54LCBwMC55KTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XG4gICAgdmFyIHAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4W2ldKTtcbiAgICBjdHgubGluZVRvKHAueCwgcC55KTtcbiAgfVxuICBjdHgubGluZVRvKHAwLngsIHAwLnkpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgsIGNhbWVyYSwgd2F0ZXJab25lcykge1xuICBpZiAoIXdhdGVyWm9uZXMgfHwgd2F0ZXJab25lcy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcbiAgdmFyIGNhbWVyYV95ID0gY2FtZXJhLnBvcy55O1xuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xuICBcbiAgY3R4LnNhdmUoKTtcbiAgXG4gIC8vIFNldCB3YXRlciBzdHlsZVxuICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDY0LCAxNjQsIDIyMywgMC42KVwiOyAvLyBTZW1pLXRyYW5zcGFyZW50IGJsdWVcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDMyLCAxMzIsIDE5MSwgMC44KVwiOyAvLyBEYXJrZXIgYmx1ZSBmb3IgZWRnZXNcbiAgY3R4LmxpbmVXaWR0aCA9IDIgLyB6b29tO1xuICBcbiAgLy8gV2F2ZSBhbmltYXRpb24gYmFzZWQgb24gdGltZVxuICB2YXIgd2F2ZU9mZnNldCA9IERhdGUubm93KCkgKiAwLjAwMTsgLy8gU2xvdyB3YXZlIGFuaW1hdGlvblxuICBcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB3YXRlclpvbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHdhdGVyID0gd2F0ZXJab25lc1tpXTtcbiAgICB2YXIgd2F0ZXJYID0gd2F0ZXIucG9zaXRpb24ueDtcbiAgICB2YXIgd2F0ZXJZID0gd2F0ZXIucG9zaXRpb24ueTtcbiAgICBcbiAgICAvLyBPbmx5IGRyYXcgaWYgd2F0ZXIgaXMgdmlzaWJsZSBvbiBzY3JlZW5cbiAgICBpZiAod2F0ZXJYICsgd2F0ZXIud2lkdGggPCBjYW1lcmFfeCAtIDEwIHx8IHdhdGVyWCA+IGNhbWVyYV94ICsgMjApIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgXG4gICAgLy8gRHJhdyB3YXRlciB3aXRoIHdhdmUgZWZmZWN0IG9uIHRvcFxuICAgIGN0eC5tb3ZlVG8od2F0ZXJYLCB3YXRlclkpO1xuICAgIFxuICAgIC8vIENyZWF0ZSB3YXZlIHBhdHRlcm4gYWxvbmcgdGhlIHRvcFxuICAgIHZhciB3YXZlU2VnbWVudHMgPSBNYXRoLmNlaWwod2F0ZXIud2lkdGggLyAwLjUpO1xuICAgIGZvciAodmFyIGogPSAwOyBqIDw9IHdhdmVTZWdtZW50czsgaisrKSB7XG4gICAgICB2YXIgeCA9IHdhdGVyWCArIChqIC8gd2F2ZVNlZ21lbnRzKSAqIHdhdGVyLndpZHRoO1xuICAgICAgdmFyIHdhdmVIZWlnaHQgPSBNYXRoLnNpbigoaiAqIDAuNSArIHdhdmVPZmZzZXQpICogMikgKiAwLjE7XG4gICAgICBjdHgubGluZVRvKHgsIHdhdGVyWSArIHdhdmVIZWlnaHQpO1xuICAgIH1cbiAgICBcbiAgICAvLyBDb21wbGV0ZSB0aGUgd2F0ZXIgcmVjdGFuZ2xlXG4gICAgY3R4LmxpbmVUbyh3YXRlclggKyB3YXRlci53aWR0aCwgd2F0ZXJZIC0gd2F0ZXIuZGVwdGgpO1xuICAgIGN0eC5saW5lVG8od2F0ZXJYLCB3YXRlclkgLSB3YXRlci5kZXB0aCk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIFxuICAgIC8vIEZpbGwgYW5kIHN0cm9rZVxuICAgIGN0eC5maWxsKCk7XG4gICAgY3R4LnN0cm9rZSgpO1xuICAgIFxuICAgIC8vIEFkZCBzb21lIHN1cmZhY2UgcmlwcGxlc1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpXCI7XG4gICAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xuICAgIFxuICAgIGZvciAodmFyIGsgPSAwOyBrIDwgMzsgaysrKSB7XG4gICAgICB2YXIgcmlwcGxlWCA9IHdhdGVyWCArIHdhdGVyLndpZHRoICogKDAuMiArIGsgKiAwLjMpO1xuICAgICAgdmFyIHJpcHBsZU9mZnNldCA9IE1hdGguc2luKCh3YXZlT2Zmc2V0ICsgaykgKiAzKSAqIDAuMDU7XG4gICAgICBcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5tb3ZlVG8ocmlwcGxlWCAtIDAuMiwgd2F0ZXJZICsgcmlwcGxlT2Zmc2V0KTtcbiAgICAgIGN0eC5saW5lVG8ocmlwcGxlWCArIDAuMiwgd2F0ZXJZICsgcmlwcGxlT2Zmc2V0KTtcbiAgICAgIGN0eC5zdHJva2UoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gRHJhdyB3YWxscyBhbmQgZmxvb3JcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDEwMCwgMTAwLCAxMDAsIDAuOClcIjsgLy8gR3JheSBmb3Igd2FsbHNcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoNjAsIDYwLCA2MCwgMS4wKVwiO1xuICAgIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcbiAgICBcbiAgICB2YXIgd2FsbFRoaWNrbmVzcyA9IDAuMjtcbiAgICBcbiAgICAvLyBMZWZ0IHdhbGwgLSBleHRlbmRzIGZyb20gYm90dG9tIHRvIDAuNSBhYm92ZSB3YXRlciBzdXJmYWNlXG4gICAgY3R4LmZpbGxSZWN0KFxuICAgICAgd2F0ZXJYIC0gd2FsbFRoaWNrbmVzcywgXG4gICAgICB3YXRlclkgLSB3YXRlci5kZXB0aCAtIHdhbGxUaGlja25lc3MsIFxuICAgICAgd2FsbFRoaWNrbmVzcywgXG4gICAgICB3YXRlci5kZXB0aCArIHdhbGxUaGlja25lc3MgKyAwLjVcbiAgICApO1xuICAgIFxuICAgIC8vIFJpZ2h0IHdhbGwgLSBleHRlbmRzIGZyb20gYm90dG9tIHRvIDAuNSBhYm92ZSB3YXRlciBzdXJmYWNlXG4gICAgY3R4LmZpbGxSZWN0KFxuICAgICAgd2F0ZXJYICsgd2F0ZXIud2lkdGgsIFxuICAgICAgd2F0ZXJZIC0gd2F0ZXIuZGVwdGggLSB3YWxsVGhpY2tuZXNzLCBcbiAgICAgIHdhbGxUaGlja25lc3MsIFxuICAgICAgd2F0ZXIuZGVwdGggKyB3YWxsVGhpY2tuZXNzICsgMC41XG4gICAgKTtcbiAgICBcbiAgICAvLyBCb3R0b20gZmxvb3JcbiAgICBjdHguZmlsbFJlY3QoXG4gICAgICB3YXRlclggLSB3YWxsVGhpY2tuZXNzLCBcbiAgICAgIHdhdGVyWSAtIHdhdGVyLmRlcHRoIC0gd2FsbFRoaWNrbmVzcywgXG4gICAgICB3YXRlci53aWR0aCArIDIgKiB3YWxsVGhpY2tuZXNzLCBcbiAgICAgIHdhbGxUaGlja25lc3NcbiAgICApO1xuICAgIFxuICAgIC8vIFJlc2V0IHN0cm9rZSBzdHlsZSBmb3IgbmV4dCB3YXRlciB6b25lXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDMyLCAxMzIsIDE5MSwgMC44KVwiO1xuICB9XG4gIFxuICBjdHgucmVzdG9yZSgpO1xufTsiLCJ2YXIgc2NhdHRlclBsb3QgPSByZXF1aXJlKFwiLi9zY2F0dGVyLXBsb3RcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwbG90R3JhcGhzOiBmdW5jdGlvbihncmFwaEVsZW0sIHRvcFNjb3Jlc0VsZW0sIHNjYXR0ZXJQbG90RWxlbSwgbGFzdFN0YXRlLCBzY29yZXMsIGNvbmZpZykge1xuICAgIGxhc3RTdGF0ZSA9IGxhc3RTdGF0ZSB8fCB7fTtcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBzY29yZXMubGVuZ3RoXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XG4gICAgdmFyIG5leHRTdGF0ZSA9IGN3X3N0b3JlR3JhcGhTY29yZXMoXG4gICAgICBsYXN0U3RhdGUsIHNjb3JlcywgZ2VuZXJhdGlvblNpemVcbiAgICApO1xuICAgIC8vIERlYnVnOiBjb25zb2xlLmxvZyhzY29yZXMsIG5leHRTdGF0ZSk7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgICBjd19wbG90QXZlcmFnZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19wbG90RWxpdGUobmV4dFN0YXRlLCBncmFwaGN0eCk7XG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19saXN0VG9wU2NvcmVzKHRvcFNjb3Jlc0VsZW0sIG5leHRTdGF0ZSk7XG4gICAgbmV4dFN0YXRlLnNjYXR0ZXJHcmFwaCA9IGRyYXdBbGxSZXN1bHRzKFxuICAgICAgc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIG5leHRTdGF0ZSwgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxuICAgICk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfSxcbiAgY2xlYXJHcmFwaGljczogZnVuY3Rpb24oZ3JhcGhFbGVtKSB7XG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBjd19zdG9yZUdyYXBoU2NvcmVzKGxhc3RTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICAvLyBEZWJ1ZzogY29uc29sZS5sb2coY3dfY2FyU2NvcmVzKTtcbiAgXG4gIC8vIFN0b3JlIHRoZSB0b3AgY2FyJ3MgY29tcGxldGUgZGF0YSBpbmNsdWRpbmcgZ2Vub21lXG4gIHZhciB0b3BDYXJEYXRhID0ge1xuICAgIHNjb3JlOiBjd19jYXJTY29yZXNbMF0uc2NvcmUsXG4gICAgZGVmOiBjd19jYXJTY29yZXNbMF0uZGVmLCAgLy8gQ29tcGxldGUgY2FyIGRlZmluaXRpb24gd2l0aCBnZW5vbWVcbiAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgfTtcbiAgXG4gIHJldHVybiB7XG4gICAgY3dfdG9wU2NvcmVzOiAobGFzdFN0YXRlLmN3X3RvcFNjb3JlcyB8fCBbXSlcbiAgICAuY29uY2F0KFtjd19jYXJTY29yZXNbMF0uc2NvcmVdKSxcbiAgICBjd190b3BDYXJzV2l0aEdlbm9tZTogKGxhc3RTdGF0ZS5jd190b3BDYXJzV2l0aEdlbm9tZSB8fCBbXSlcbiAgICAuY29uY2F0KFt0b3BDYXJEYXRhXSksXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiAobGFzdFN0YXRlLmN3X2dyYXBoQXZlcmFnZSB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2F2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaEVsaXRlOiAobGFzdFN0YXRlLmN3X2dyYXBoRWxpdGUgfHwgW10pLmNvbmNhdChbXG4gICAgICBjd19lbGl0ZWF2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaFRvcDogKGxhc3RTdGF0ZS5jd19ncmFwaFRvcCB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZS52XG4gICAgXSksXG4gICAgYWxsUmVzdWx0czogKGxhc3RTdGF0ZS5hbGxSZXN1bHRzIHx8IFtdKS5jb25jYXQoY3dfY2FyU2NvcmVzKSxcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19wbG90VG9wKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhUb3AgPSBzdGF0ZS5jd19ncmFwaFRvcDtcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoVG9wLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiNDODNCM0JcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RFbGl0ZShzdGF0ZSwgZ3JhcGhjdHgpIHtcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhFbGl0ZS5sZW5ndGg7XG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjN0JDNzREXCI7XG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RBdmVyYWdlKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhBdmVyYWdlLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEF2ZXJhZ2Vba10pO1xuICB9XG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gIHZhciBzdW0gPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7XG59XG5cbmZ1bmN0aW9uIGN3X2F2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICB2YXIgc3VtID0gMDtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBnZW5lcmF0aW9uU2l6ZTtcbn1cblxuZnVuY3Rpb24gY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KSB7XG4gIGdyYXBoY2FudmFzLndpZHRoID0gZ3JhcGhjYW52YXMud2lkdGg7XG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XG4gIGdyYXBoY3R4LnNjYWxlKDEsIC0xKTtcbiAgZ3JhcGhjdHgubGluZVdpZHRoID0gMTtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDIpO1xuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDQpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X2xpc3RUb3BTY29yZXMoZWxlbSwgc3RhdGUpIHtcbiAgdmFyIGN3X3RvcFNjb3JlcyA9IHN0YXRlLmN3X3RvcFNjb3JlcztcbiAgdmFyIGN3X3RvcENhcnNXaXRoR2Vub21lID0gc3RhdGUuY3dfdG9wQ2Fyc1dpdGhHZW5vbWUgfHwgW107XG4gIHZhciB0cyA9IGVsZW07XG4gIHRzLmlubmVySFRNTCA9IFwiPGI+VG9wIFNjb3Jlczo8L2I+PGJyIC8+XCI7XG4gIFxuICAvLyBDcmVhdGUgcGFpcnMgb2Ygc2NvcmVzIGFuZCBnZW5vbWUgZGF0YSwgc29ydGVkIGJ5IHNjb3JlXG4gIHZhciB0b3BTY29yZXNXaXRoR2Vub21lID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY3dfdG9wU2NvcmVzLmxlbmd0aCAmJiBpIDwgY3dfdG9wQ2Fyc1dpdGhHZW5vbWUubGVuZ3RoOyBpKyspIHtcbiAgICB0b3BTY29yZXNXaXRoR2Vub21lLnB1c2goe1xuICAgICAgc2NvcmU6IGN3X3RvcFNjb3Jlc1tpXSxcbiAgICAgIGdlbm9tZTogY3dfdG9wQ2Fyc1dpdGhHZW5vbWVbaV1cbiAgICB9KTtcbiAgfVxuICBcbiAgLy8gU29ydCBieSBzY29yZSB2YWx1ZSBkZXNjZW5kaW5nXG4gIHRvcFNjb3Jlc1dpdGhHZW5vbWUuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIGlmIChhLnNjb3JlLnYgPiBiLnNjb3JlLnYpIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMVxuICAgIH1cbiAgfSk7XG5cbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLm1pbigxMCwgdG9wU2NvcmVzV2l0aEdlbm9tZS5sZW5ndGgpOyBrKyspIHtcbiAgICB2YXIgZW50cnkgPSB0b3BTY29yZXNXaXRoR2Vub21lW2tdO1xuICAgIHZhciB0b3BTY29yZSA9IGVudHJ5LnNjb3JlO1xuICAgIHZhciBnZW5vbWVEYXRhID0gZW50cnkuZ2Vub21lO1xuICAgIFxuICAgIHZhciBuID0gXCIjXCIgKyAoayArIDEpICsgXCI6XCI7XG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcbiAgICB2YXIgZGlzdGFuY2UgPSBcImQ6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnggKiAxMDApIC8gMTAwO1xuICAgIHZhciB5cmFuZ2UgPSAgXCJoOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgKyBcIi9cIiArIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgKyBcIm1cIjtcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgdG9wU2NvcmUuaSArIFwiKVwiO1xuICAgIFxuICAgIC8vIENyZWF0ZSBhIHJvdyB3aXRoIHNjb3JlIGluZm8gYW5kIGdlbm9tZSBidXR0b25cbiAgICB2YXIgcm93RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICByb3dEaXYuY2xhc3NOYW1lID0gXCJ0b3Atc2NvcmUtcm93XCI7XG4gICAgcm93RGl2LnN0eWxlLm1hcmdpbkJvdHRvbSA9IFwiNXB4XCI7XG4gICAgcm93RGl2LnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIjtcbiAgICByb3dEaXYuc3R5bGUuYWxpZ25JdGVtcyA9IFwiY2VudGVyXCI7XG4gICAgcm93RGl2LnN0eWxlLmp1c3RpZnlDb250ZW50ID0gXCJzcGFjZS1iZXR3ZWVuXCI7XG4gICAgXG4gICAgdmFyIHNjb3JlU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgIHNjb3JlU3Bhbi5pbm5lckhUTUwgPSBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIik7XG4gICAgc2NvcmVTcGFuLnN0eWxlLmZsZXggPSBcIjFcIjtcbiAgICBcbiAgICB2YXIgZ2Vub21lQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcbiAgICBnZW5vbWVCdXR0b24udGV4dENvbnRlbnQgPSBcIlZpZXcgR2Vub21lXCI7XG4gICAgZ2Vub21lQnV0dG9uLmNsYXNzTmFtZSA9IFwiZ2Vub21lLXZpZXctYnRuXCI7XG4gICAgZ2Vub21lQnV0dG9uLnN0eWxlLm1hcmdpbkxlZnQgPSBcIjEwcHhcIjtcbiAgICBnZW5vbWVCdXR0b24uc3R5bGUucGFkZGluZyA9IFwiMnB4IDhweFwiO1xuICAgIGdlbm9tZUJ1dHRvbi5zdHlsZS5mb250U2l6ZSA9IFwiMTJweFwiO1xuICAgIGdlbm9tZUJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJkYXRhLWdlbm9tZS1pbmRleFwiLCBrKTtcbiAgICBcbiAgICAvLyBTdG9yZSBnZW5vbWUgZGF0YSBmb3IgbGF0ZXIgYWNjZXNzXG4gICAgZ2Vub21lQnV0dG9uLmdlbm9tZURhdGEgPSBnZW5vbWVEYXRhO1xuICAgIFxuICAgIC8vIEFkZCBjbGljayBoYW5kbGVyXG4gICAgZ2Vub21lQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh3aW5kb3cuc2hvd0dlbm9tZVZpZXcpIHtcbiAgICAgICAgd2luZG93LnNob3dHZW5vbWVWaWV3KHRoaXMuZ2Vub21lRGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGYWxsYmFjayBpZiBnZW5vbWUgdmlld2VyIG5vdCBhdmFpbGFibGVcbiAgICAgICAgYWxlcnQoXCJHZW5vbWUgdmlld2VyIG5vdCB5ZXQgaW5pdGlhbGl6ZWQuIFBsZWFzZSB3YWl0IGEgbW9tZW50IGFuZCB0cnkgYWdhaW4uXCIpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIHJvd0Rpdi5hcHBlbmRDaGlsZChzY29yZVNwYW4pO1xuICAgIHJvd0Rpdi5hcHBlbmRDaGlsZChnZW5vbWVCdXR0b24pO1xuICAgIHRzLmFwcGVuZENoaWxkKHJvd0Rpdik7XG4gIH1cbn1cblxuZnVuY3Rpb24gZHJhd0FsbFJlc3VsdHMoc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIGFsbFJlc3VsdHMsIHByZXZpb3VzR3JhcGgpe1xuICBpZighc2NhdHRlclBsb3RFbGVtKSByZXR1cm47XG4gIHJldHVybiBzY2F0dGVyUGxvdChzY2F0dGVyUGxvdEVsZW0sIGFsbFJlc3VsdHMsIGNvbmZpZy5wcm9wZXJ0eU1hcCwgcHJldmlvdXNHcmFwaClcbn1cbiIsIi8qIGdsb2JhbHMgdmlzIEhpZ2hjaGFydHMgKi9cblxuLy8gQ2FsbGVkIHdoZW4gdGhlIFZpc3VhbGl6YXRpb24gQVBJIGlzIGxvYWRlZC5cblxubW9kdWxlLmV4cG9ydHMgPSBoaWdoQ2hhcnRzO1xuZnVuY3Rpb24gaGlnaENoYXJ0cyhlbGVtLCBzY29yZXMpe1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNjb3Jlc1swXS5kZWYpO1xuICBrZXlzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24oY3VyQXJyYXksIGtleSl7XG4gICAgdmFyIGwgPSBzY29yZXNbMF0uZGVmW2tleV0ubGVuZ3RoO1xuICAgIHZhciBzdWJBcnJheSA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsOyBpKyspe1xuICAgICAgc3ViQXJyYXkucHVzaChrZXkgKyBcIi5cIiArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gY3VyQXJyYXkuY29uY2F0KHN1YkFycmF5KTtcbiAgfSwgW10pO1xuICBmdW5jdGlvbiByZXRyaWV2ZVZhbHVlKG9iaiwgcGF0aCl7XG4gICAgcmV0dXJuIHBhdGguc3BsaXQoXCIuXCIpLnJlZHVjZShmdW5jdGlvbihjdXJWYWx1ZSwga2V5KXtcbiAgICAgIHJldHVybiBjdXJWYWx1ZVtrZXldO1xuICAgIH0sIG9iaik7XG4gIH1cblxuICB2YXIgZGF0YU9iaiA9IE9iamVjdC5rZXlzKHNjb3JlcykucmVkdWNlKGZ1bmN0aW9uKGt2LCBzY29yZSl7XG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICBrdltrZXldLmRhdGEucHVzaChbXG4gICAgICAgIHJldHJpZXZlVmFsdWUoc2NvcmUuZGVmLCBrZXkpLCBzY29yZS5zY29yZS52XG4gICAgICBdKVxuICAgIH0pXG4gICAgcmV0dXJuIGt2O1xuICB9LCBrZXlzLnJlZHVjZShmdW5jdGlvbihrdiwga2V5KXtcbiAgICBrdltrZXldID0ge1xuICAgICAgbmFtZToga2V5LFxuICAgICAgZGF0YTogW10sXG4gICAgfVxuICAgIHJldHVybiBrdjtcbiAgfSwge30pKVxuICBIaWdoY2hhcnRzLmNoYXJ0KGVsZW0uaWQsIHtcbiAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgdHlwZTogJ3NjYXR0ZXInLFxuICAgICAgICAgIHpvb21UeXBlOiAneHknXG4gICAgICB9LFxuICAgICAgdGl0bGU6IHtcbiAgICAgICAgICB0ZXh0OiAnUHJvcGVydHkgVmFsdWUgdG8gU2NvcmUnXG4gICAgICB9LFxuICAgICAgeEF4aXM6IHtcbiAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICB0ZXh0OiAnTm9ybWFsaXplZCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN0YXJ0T25UaWNrOiB0cnVlLFxuICAgICAgICAgIGVuZE9uVGljazogdHJ1ZSxcbiAgICAgICAgICBzaG93TGFzdExhYmVsOiB0cnVlXG4gICAgICB9LFxuICAgICAgeUF4aXM6IHtcbiAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICB0ZXh0OiAnU2NvcmUnXG4gICAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGxlZ2VuZDoge1xuICAgICAgICAgIGxheW91dDogJ3ZlcnRpY2FsJyxcbiAgICAgICAgICBhbGlnbjogJ2xlZnQnLFxuICAgICAgICAgIHZlcnRpY2FsQWxpZ246ICd0b3AnLFxuICAgICAgICAgIHg6IDEwMCxcbiAgICAgICAgICB5OiA3MCxcbiAgICAgICAgICBmbG9hdGluZzogdHJ1ZSxcbiAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IChIaWdoY2hhcnRzLnRoZW1lICYmIEhpZ2hjaGFydHMudGhlbWUubGVnZW5kQmFja2dyb3VuZENvbG9yKSB8fCAnI0ZGRkZGRicsXG4gICAgICAgICAgYm9yZGVyV2lkdGg6IDFcbiAgICAgIH0sXG4gICAgICBwbG90T3B0aW9uczoge1xuICAgICAgICAgIHNjYXR0ZXI6IHtcbiAgICAgICAgICAgICAgbWFya2VyOiB7XG4gICAgICAgICAgICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgICAgICAgICAgICBzdGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICBob3Zlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lQ29sb3I6ICdyZ2IoMTAwLDEwMCwxMDApJ1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgc3RhdGVzOiB7XG4gICAgICAgICAgICAgICAgICBob3Zlcjoge1xuICAgICAgICAgICAgICAgICAgICAgIG1hcmtlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdG9vbHRpcDoge1xuICAgICAgICAgICAgICAgICAgaGVhZGVyRm9ybWF0OiAnPGI+e3Nlcmllcy5uYW1lfTwvYj48YnI+JyxcbiAgICAgICAgICAgICAgICAgIHBvaW50Rm9ybWF0OiAne3BvaW50Lnh9LCB7cG9pbnQueX0nXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc2VyaWVzOiBrZXlzLm1hcChmdW5jdGlvbihrZXkpe1xuICAgICAgICByZXR1cm4gZGF0YU9ialtrZXldO1xuICAgICAgfSlcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHZpc0NoYXJ0KGVsZW0sIHNjb3JlcywgcHJvcGVydHlNYXAsIGdyYXBoKSB7XG5cbiAgLy8gQ3JlYXRlIGFuZCBwb3B1bGF0ZSBhIGRhdGEgdGFibGUuXG4gIHZhciBkYXRhID0gbmV3IHZpcy5EYXRhU2V0KCk7XG4gIHNjb3Jlcy5mb3JFYWNoKGZ1bmN0aW9uKHNjb3JlSW5mbyl7XG4gICAgZGF0YS5hZGQoe1xuICAgICAgeDogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC54KSxcbiAgICAgIHk6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXG4gICAgICB6OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxuICAgICAgc3R5bGU6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueiksXG4gICAgICAvLyBleHRyYTogZGVmLmFuY2VzdHJ5XG4gICAgfSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGdldFByb3BlcnR5KGluZm8sIGtleSl7XG4gICAgaWYoa2V5ID09PSBcInNjb3JlXCIpe1xuICAgICAgcmV0dXJuIGluZm8uc2NvcmUudlxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaW5mby5kZWZba2V5XTtcbiAgICB9XG4gIH1cblxuICAvLyBzcGVjaWZ5IG9wdGlvbnNcbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgd2lkdGg6ICAnNjAwcHgnLFxuICAgIGhlaWdodDogJzYwMHB4JyxcbiAgICBzdHlsZTogJ2RvdC1zaXplJyxcbiAgICBzaG93UGVyc3BlY3RpdmU6IHRydWUsXG4gICAgc2hvd0xlZ2VuZDogdHJ1ZSxcbiAgICBzaG93R3JpZDogdHJ1ZSxcbiAgICBzaG93U2hhZG93OiBmYWxzZSxcblxuICAgIC8vIE9wdGlvbiB0b29sdGlwIGNhbiBiZSB0cnVlLCBmYWxzZSwgb3IgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSBzdHJpbmcgd2l0aCBIVE1MIGNvbnRlbnRzXG4gICAgdG9vbHRpcDogZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAvLyBwYXJhbWV0ZXIgcG9pbnQgY29udGFpbnMgcHJvcGVydGllcyB4LCB5LCB6LCBhbmQgZGF0YVxuICAgICAgLy8gZGF0YSBpcyB0aGUgb3JpZ2luYWwgb2JqZWN0IHBhc3NlZCB0byB0aGUgcG9pbnQgY29uc3RydWN0b3JcbiAgICAgIHJldHVybiAnc2NvcmU6IDxiPicgKyBwb2ludC56ICsgJzwvYj48YnI+JzsgLy8gKyBwb2ludC5kYXRhLmV4dHJhO1xuICAgIH0sXG5cbiAgICAvLyBUb29sdGlwIGRlZmF1bHQgc3R5bGluZyBjYW4gYmUgb3ZlcnJpZGRlblxuICAgIHRvb2x0aXBTdHlsZToge1xuICAgICAgY29udGVudDoge1xuICAgICAgICBiYWNrZ3JvdW5kICAgIDogJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC43KScsXG4gICAgICAgIHBhZGRpbmcgICAgICAgOiAnMTBweCcsXG4gICAgICAgIGJvcmRlclJhZGl1cyAgOiAnMTBweCdcbiAgICAgIH0sXG4gICAgICBsaW5lOiB7XG4gICAgICAgIGJvcmRlckxlZnQgICAgOiAnMXB4IGRvdHRlZCByZ2JhKDAsIDAsIDAsIDAuNSknXG4gICAgICB9LFxuICAgICAgZG90OiB7XG4gICAgICAgIGJvcmRlciAgICAgICAgOiAnNXB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC41KSdcbiAgICAgIH1cbiAgICB9LFxuXG4gICAga2VlcEFzcGVjdFJhdGlvOiB0cnVlLFxuICAgIHZlcnRpY2FsUmF0aW86IDAuNVxuICB9O1xuXG4gIHZhciBjYW1lcmEgPSBncmFwaCA/IGdyYXBoLmdldENhbWVyYVBvc2l0aW9uKCkgOiBudWxsO1xuXG4gIC8vIGNyZWF0ZSBvdXIgZ3JhcGhcbiAgdmFyIGNvbnRhaW5lciA9IGVsZW07XG4gIGdyYXBoID0gbmV3IHZpcy5HcmFwaDNkKGNvbnRhaW5lciwgZGF0YSwgb3B0aW9ucyk7XG5cbiAgaWYgKGNhbWVyYSkgZ3JhcGguc2V0Q2FtZXJhUG9zaXRpb24oY2FtZXJhKTsgLy8gcmVzdG9yZSBjYW1lcmEgcG9zaXRpb25cbiAgcmV0dXJuIGdyYXBoO1xufVxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGdlbmVyYXRlUmFuZG9tO1xuZnVuY3Rpb24gZ2VuZXJhdGVSYW5kb20oKXtcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59XG4iLCIvLyBodHRwOi8vc3VubWluZ3Rhby5ibG9nc3BvdC5jb20vMjAxNi8xMS9pbmJyZWVkaW5nLWNvZWZmaWNpZW50Lmh0bWxcbm1vZHVsZS5leHBvcnRzID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50O1xuXG5mdW5jdGlvbiBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQoY2hpbGQpe1xuICB2YXIgbmFtZUluZGV4ID0gbmV3IE1hcCgpO1xuICB2YXIgZmxhZ2dlZCA9IG5ldyBTZXQoKTtcbiAgdmFyIGNvbnZlcmdlbmNlUG9pbnRzID0gbmV3IFNldCgpO1xuICBjcmVhdGVBbmNlc3RyeU1hcChjaGlsZCwgW10pO1xuXG4gIHZhciBzdG9yZWRDb2VmZmljaWVudHMgPSBuZXcgTWFwKCk7XG5cbiAgcmV0dXJuIEFycmF5LmZyb20oY29udmVyZ2VuY2VQb2ludHMudmFsdWVzKCkpLnJlZHVjZShmdW5jdGlvbihzdW0sIHBvaW50KXtcbiAgICB2YXIgaUNvID0gZ2V0Q29lZmZpY2llbnQocG9pbnQpO1xuICAgIHJldHVybiBzdW0gKyBpQ287XG4gIH0sIDApO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUFuY2VzdHJ5TWFwKGluaXROb2RlKXtcbiAgICB2YXIgaXRlbXNJblF1ZXVlID0gW3sgbm9kZTogaW5pdE5vZGUsIHBhdGg6IFtdIH1dO1xuICAgIGRve1xuICAgICAgdmFyIGl0ZW0gPSBpdGVtc0luUXVldWUuc2hpZnQoKTtcbiAgICAgIHZhciBub2RlID0gaXRlbS5ub2RlO1xuICAgICAgdmFyIHBhdGggPSBpdGVtLnBhdGg7XG4gICAgICBpZihwcm9jZXNzSXRlbShub2RlLCBwYXRoKSl7XG4gICAgICAgIHZhciBuZXh0UGF0aCA9IFsgbm9kZS5pZCBdLmNvbmNhdChwYXRoKTtcbiAgICAgICAgaXRlbXNJblF1ZXVlID0gaXRlbXNJblF1ZXVlLmNvbmNhdChub2RlLmFuY2VzdHJ5Lm1hcChmdW5jdGlvbihwYXJlbnQpe1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBub2RlOiBwYXJlbnQsXG4gICAgICAgICAgICBwYXRoOiBuZXh0UGF0aFxuICAgICAgICAgIH07XG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICB9d2hpbGUoaXRlbXNJblF1ZXVlLmxlbmd0aCk7XG5cblxuICAgIGZ1bmN0aW9uIHByb2Nlc3NJdGVtKG5vZGUsIHBhdGgpe1xuICAgICAgdmFyIG5ld0FuY2VzdG9yID0gIW5hbWVJbmRleC5oYXMobm9kZS5pZCk7XG4gICAgICBpZihuZXdBbmNlc3Rvcil7XG4gICAgICAgIG5hbWVJbmRleC5zZXQobm9kZS5pZCwge1xuICAgICAgICAgIHBhcmVudHM6IChub2RlLmFuY2VzdHJ5IHx8IFtdKS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQuaWQ7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgaWQ6IG5vZGUuaWQsXG4gICAgICAgICAgY2hpbGRyZW46IFtdLFxuICAgICAgICAgIGNvbnZlcmdlbmNlczogW10sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBmbGFnZ2VkLmFkZChub2RlLmlkKVxuICAgICAgICBuYW1lSW5kZXguZ2V0KG5vZGUuaWQpLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGRJZGVudGlmaWVyKXtcbiAgICAgICAgICB2YXIgb2Zmc2V0cyA9IGZpbmRDb252ZXJnZW5jZShjaGlsZElkZW50aWZpZXIucGF0aCwgcGF0aCk7XG4gICAgICAgICAgaWYoIW9mZnNldHMpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgY2hpbGRJRCA9IHBhdGhbb2Zmc2V0c1sxXV07XG4gICAgICAgICAgY29udmVyZ2VuY2VQb2ludHMuYWRkKGNoaWxkSUQpO1xuICAgICAgICAgIG5hbWVJbmRleC5nZXQoY2hpbGRJRCkuY29udmVyZ2VuY2VzLnB1c2goe1xuICAgICAgICAgICAgcGFyZW50OiBub2RlLmlkLFxuICAgICAgICAgICAgb2Zmc2V0czogb2Zmc2V0cyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmKHBhdGgubGVuZ3RoKXtcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5wdXNoKHtcbiAgICAgICAgICBjaGlsZDogcGF0aFswXSxcbiAgICAgICAgICBwYXRoOiBwYXRoXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZighbmV3QW5jZXN0b3Ipe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZighbm9kZS5hbmNlc3RyeSl7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvZWZmaWNpZW50KGlkKXtcbiAgICBpZihzdG9yZWRDb2VmZmljaWVudHMuaGFzKGlkKSl7XG4gICAgICByZXR1cm4gc3RvcmVkQ29lZmZpY2llbnRzLmdldChpZCk7XG4gICAgfVxuICAgIHZhciBub2RlID0gbmFtZUluZGV4LmdldChpZCk7XG4gICAgdmFyIHZhbCA9IG5vZGUuY29udmVyZ2VuY2VzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBvaW50KXtcbiAgICAgIHJldHVybiBzdW0gKyBNYXRoLnBvdygxIC8gMiwgcG9pbnQub2Zmc2V0cy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCB2YWx1ZSl7XG4gICAgICAgIHJldHVybiBzdW0gKyB2YWx1ZTtcbiAgICAgIH0sIDEpKSAqICgxICsgZ2V0Q29lZmZpY2llbnQocG9pbnQucGFyZW50KSk7XG4gICAgfSwgMCk7XG4gICAgc3RvcmVkQ29lZmZpY2llbnRzLnNldChpZCwgdmFsKTtcblxuICAgIHJldHVybiB2YWw7XG5cbiAgfVxuICBmdW5jdGlvbiBmaW5kQ29udmVyZ2VuY2UobGlzdEEsIGxpc3RCKXtcbiAgICB2YXIgY2ksIGNqLCBsaSwgbGo7XG4gICAgb3V0ZXJsb29wOlxuICAgIGZvcihjaSA9IDAsIGxpID0gbGlzdEEubGVuZ3RoOyBjaSA8IGxpOyBjaSsrKXtcbiAgICAgIGZvcihjaiA9IDAsIGxqID0gbGlzdEIubGVuZ3RoOyBjaiA8IGxqOyBjaisrKXtcbiAgICAgICAgaWYobGlzdEFbY2ldID09PSBsaXN0Qltjal0pe1xuICAgICAgICAgIGJyZWFrIG91dGVybG9vcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZihjaSA9PT0gbGkpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gW2NpLCBjal07XG4gIH1cbn1cbiIsInZhciBjYXJDb25zdHJ1Y3QgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XG5cbnZhciBjYXJDb25zdGFudHMgPSBjYXJDb25zdHJ1Y3QuY2FyQ29uc3RhbnRzKCk7XG5cbnZhciBzY2hlbWEgPSBjYXJDb25zdHJ1Y3QuZ2VuZXJhdGVTY2hlbWEoY2FyQ29uc3RhbnRzKTtcbnZhciBwaWNrUGFyZW50ID0gcmVxdWlyZShcIi4vcGlja1BhcmVudFwiKTtcbnZhciBzZWxlY3RGcm9tQWxsUGFyZW50cyA9IHJlcXVpcmUoXCIuL3NlbGVjdEZyb21BbGxQYXJlbnRzXCIpO1xuY29uc3QgY29uc3RhbnRzID0ge1xuICBnZW5lcmF0aW9uU2l6ZTogMjAsXG4gIHNjaGVtYTogc2NoZW1hLFxuICBjaGFtcGlvbkxlbmd0aDogMSxcbiAgbXV0YXRpb25fcmFuZ2U6IDEsXG4gIGdlbl9tdXRhdGlvbjogMC4wNSxcbn07XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBjdXJyZW50Q2hvaWNlcyA9IG5ldyBNYXAoKTtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXG4gICAge30sXG4gICAgY29uc3RhbnRzLFxuICAgIHtcbiAgICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzOiBzZWxlY3RGcm9tQWxsUGFyZW50cyxcbiAgICAgIGdlbmVyYXRlUmFuZG9tOiByZXF1aXJlKFwiLi9nZW5lcmF0ZVJhbmRvbVwiKSxcbiAgICAgIHBpY2tQYXJlbnQ6IHBpY2tQYXJlbnQuYmluZCh2b2lkIDAsIGN1cnJlbnRDaG9pY2VzKSxcbiAgICB9XG4gICk7XG59XG5tb2R1bGUuZXhwb3J0cy5jb25zdGFudHMgPSBjb25zdGFudHNcbiIsInZhciBuQXR0cmlidXRlcyA9IDE1O1xubW9kdWxlLmV4cG9ydHMgPSBwaWNrUGFyZW50O1xuXG5mdW5jdGlvbiBwaWNrUGFyZW50KGN1cnJlbnRDaG9pY2VzLCBjaG9vc2VJZCwga2V5IC8qICwgcGFyZW50cyAqLyl7XG4gIGlmKCFjdXJyZW50Q2hvaWNlcy5oYXMoY2hvb3NlSWQpKXtcbiAgICBjdXJyZW50Q2hvaWNlcy5zZXQoY2hvb3NlSWQsIGluaXRpYWxpemVQaWNrKCkpXG4gIH1cbiAgLy8gY29uc29sZS5sb2coY2hvb3NlSWQpO1xuICB2YXIgc3RhdGUgPSBjdXJyZW50Q2hvaWNlcy5nZXQoY2hvb3NlSWQpO1xuICAvLyBjb25zb2xlLmxvZyhzdGF0ZS5jdXJwYXJlbnQpO1xuICBzdGF0ZS5pKytcbiAgaWYoW1wid2hlZWxfcmFkaXVzXCIsIFwid2hlZWxfdmVydGV4XCIsIFwid2hlZWxfZGVuc2l0eVwiXS5pbmRleE9mKGtleSkgPiAtMSl7XG4gICAgc3RhdGUuY3VycGFyZW50ID0gY3dfY2hvb3NlUGFyZW50KHN0YXRlKTtcbiAgICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xuICB9XG4gIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XG4gIHJldHVybiBzdGF0ZS5jdXJwYXJlbnQ7XG5cbiAgZnVuY3Rpb24gY3dfY2hvb3NlUGFyZW50KHN0YXRlKSB7XG4gICAgdmFyIGN1cnBhcmVudCA9IHN0YXRlLmN1cnBhcmVudDtcbiAgICB2YXIgYXR0cmlidXRlSW5kZXggPSBzdGF0ZS5pO1xuICAgIHZhciBzd2FwUG9pbnQxID0gc3RhdGUuc3dhcFBvaW50MVxuICAgIHZhciBzd2FwUG9pbnQyID0gc3RhdGUuc3dhcFBvaW50MlxuICAgIC8vIGNvbnNvbGUubG9nKHN3YXBQb2ludDEsIHN3YXBQb2ludDIsIGF0dHJpYnV0ZUluZGV4KVxuICAgIGlmICgoc3dhcFBvaW50MSA9PSBhdHRyaWJ1dGVJbmRleCkgfHwgKHN3YXBQb2ludDIgPT0gYXR0cmlidXRlSW5kZXgpKSB7XG4gICAgICByZXR1cm4gY3VycGFyZW50ID09IDEgPyAwIDogMVxuICAgIH1cbiAgICByZXR1cm4gY3VycGFyZW50XG4gIH1cblxuICBmdW5jdGlvbiBpbml0aWFsaXplUGljaygpe1xuICAgIHZhciBjdXJwYXJlbnQgPSAwO1xuXG4gICAgdmFyIHN3YXBQb2ludDEgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN3YXBQb2ludDE7XG4gICAgd2hpbGUgKHN3YXBQb2ludDIgPT0gc3dhcFBvaW50MSkge1xuICAgICAgc3dhcFBvaW50MiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChuQXR0cmlidXRlcykpO1xuICAgIH1cbiAgICB2YXIgaSA9IDA7XG4gICAgcmV0dXJuIHtcbiAgICAgIGN1cnBhcmVudDogY3VycGFyZW50LFxuICAgICAgaTogaSxcbiAgICAgIHN3YXBQb2ludDE6IHN3YXBQb2ludDEsXG4gICAgICBzd2FwUG9pbnQyOiBzd2FwUG9pbnQyXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50ID0gcmVxdWlyZShcIi4vaW5icmVlZGluZy1jb2VmZmljaWVudFwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzaW1wbGVTZWxlY3Q7XG5cbmZ1bmN0aW9uIHNpbXBsZVNlbGVjdChwYXJlbnRzKXtcbiAgdmFyIHRvdGFsUGFyZW50cyA9IHBhcmVudHMubGVuZ3RoXG4gIHZhciByID0gTWF0aC5yYW5kb20oKTtcbiAgaWYgKHIgPT0gMClcbiAgICByZXR1cm4gMDtcbiAgcmV0dXJuIE1hdGguZmxvb3IoLU1hdGgubG9nKHIpICogdG90YWxQYXJlbnRzKSAlIHRvdGFsUGFyZW50cztcbn1cblxuZnVuY3Rpb24gc2VsZWN0RnJvbUFsbFBhcmVudHMocGFyZW50cywgcGFyZW50TGlzdCwgcHJldmlvdXNQYXJlbnRJbmRleCkge1xuICB2YXIgcHJldmlvdXNQYXJlbnQgPSBwYXJlbnRzW3ByZXZpb3VzUGFyZW50SW5kZXhdO1xuICB2YXIgdmFsaWRQYXJlbnRzID0gcGFyZW50cy5maWx0ZXIoZnVuY3Rpb24ocGFyZW50LCBpKXtcbiAgICBpZihwcmV2aW91c1BhcmVudEluZGV4ID09PSBpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYoIXByZXZpb3VzUGFyZW50KXtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB2YXIgY2hpbGQgPSB7XG4gICAgICBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMiksXG4gICAgICBhbmNlc3RyeTogW3ByZXZpb3VzUGFyZW50LCBwYXJlbnRdLm1hcChmdW5jdGlvbihwKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogcC5kZWYuaWQsXG4gICAgICAgICAgYW5jZXN0cnk6IHAuZGVmLmFuY2VzdHJ5XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIHZhciBpQ28gPSBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQoY2hpbGQpO1xuICAgIC8vIERlYnVnOiBjb25zb2xlLmxvZyhcImluYnJlZWRpbmcgY29lZmZpY2llbnRcIiwgaUNvKVxuICAgIGlmKGlDbyA+IDAuMjUpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSlcbiAgaWYodmFsaWRQYXJlbnRzLmxlbmd0aCA9PT0gMCl7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBhcmVudHMubGVuZ3RoKVxuICB9XG4gIHZhciB0b3RhbFNjb3JlID0gdmFsaWRQYXJlbnRzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBhcmVudCl7XG4gICAgcmV0dXJuIHN1bSArIHBhcmVudC5zY29yZS52O1xuICB9LCAwKTtcbiAgdmFyIHIgPSB0b3RhbFNjb3JlICogTWF0aC5yYW5kb20oKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHZhbGlkUGFyZW50cy5sZW5ndGg7IGkrKyl7XG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XG4gICAgaWYociA+IHNjb3JlKXtcbiAgICAgIHIgPSByIC0gc2NvcmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaTtcbn1cbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgd2luZG93ICovXG5cbnZhciBsb2dnZXIgPSByZXF1aXJlKFwiLi9sb2dnZXIvbG9nZ2VyLmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdGlhbGl6ZUdlbm9tZVZpZXdlcjogaW5pdGlhbGl6ZUdlbm9tZVZpZXdlcixcbiAgc2hvd0xlYWRlckdlbm9tZTogc2hvd0xlYWRlckdlbm9tZSxcbiAgc2hvd0dlbm9tZUNvbXBhcmlzb246IHNob3dHZW5vbWVDb21wYXJpc29uLFxuICBjbG9zZUdlbm9tZVZpZXdlcjogY2xvc2VHZW5vbWVWaWV3ZXJcbn07XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVHZW5vbWVWaWV3ZXIoKSB7XG4gIC8vIE1ha2UgZnVuY3Rpb25zIGdsb2JhbGx5IGF2YWlsYWJsZVxuICB3aW5kb3cuc2hvd0xlYWRlckdlbm9tZSA9IHNob3dMZWFkZXJHZW5vbWU7XG4gIHdpbmRvdy5zaG93R2Vub21lVmlldyA9IHNob3dHZW5vbWVDb21wYXJpc29uO1xuICB3aW5kb3cuY2xvc2VHZW5vbWVWaWV3ZXIgPSBjbG9zZUdlbm9tZVZpZXdlcjtcbiAgd2luZG93LnRvZ2dsZUNvbXBhcmlzb25Nb2RlID0gdG9nZ2xlQ29tcGFyaXNvbk1vZGU7XG4gIHdpbmRvdy51cGRhdGVMZWFkZXJHZW5vbWVWaWV3ID0gdXBkYXRlTGVhZGVyR2Vub21lVmlldztcbiAgXG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuSU5GTywgXCJHZW5vbWUgdmlld2VyIGluaXRpYWxpemVkXCIpO1xufVxuXG5mdW5jdGlvbiBzaG93TGVhZGVyR2Vub21lKCkge1xuICB2YXIgbGVhZGVyR2Vub21lID0gd2luZG93LmdldEN1cnJlbnRMZWFkZXJHZW5vbWUoKTtcbiAgXG4gIGlmICghbGVhZGVyR2Vub21lIHx8ICFsZWFkZXJHZW5vbWUuZ2Vub21lKSB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIk5vIGxlYWRlciBnZW5vbWUgYXZhaWxhYmxlIHRvIGRpc3BsYXlcIik7XG4gICAgYWxlcnQoXCJObyBjdXJyZW50IGxlYWRlciBhdmFpbGFibGUuIFdhaXQgZm9yIGNhcnMgdG8gc3Bhd24uXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIlNob3dpbmcgbGVhZGVyIGdlbm9tZSBmb3IgY2FyOlwiLCBsZWFkZXJHZW5vbWUuY2FySW5kZXgpO1xuICBcbiAgdmFyIG1vZGFsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5vbWUtdmlld2VyLW1vZGFsXCIpO1xuICB2YXIgdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdlbm9tZS10aXRsZVwiKTtcbiAgdmFyIGNvbXBhcmlzb25Nb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb21wYXJpc29uLW1vZGVcIik7XG4gIFxuICAvLyBSZXNldCBjb21wYXJpc29uIG1vZGVcbiAgY29tcGFyaXNvbk1vZGUuY2hlY2tlZCA9IGZhbHNlO1xuICB0b2dnbGVDb21wYXJpc29uTW9kZSgpO1xuICBcbiAgdGl0bGUudGV4dENvbnRlbnQgPSBgQ3VycmVudCBMZWFkZXIgR2Vub21lIChDYXIgIyR7bGVhZGVyR2Vub21lLmNhckluZGV4fSlgO1xuICBcbiAgZGlzcGxheUdlbm9tZURhdGEobGVhZGVyR2Vub21lLmdlbm9tZSwgXCJsZWFkZXItZ2Vub21lLWRhdGFcIik7XG4gIGRyYXdDYXJWaXN1YWxpemF0aW9uKGxlYWRlckdlbm9tZS5nZW5vbWUsIFwibGVhZGVyLWNhci12aXN1YWxpemF0aW9uXCIpO1xuICBcbiAgbW9kYWwuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbn1cblxuZnVuY3Rpb24gc2hvd0dlbm9tZUNvbXBhcmlzb24oaGlzdG9yaWNhbENhckRhdGEpIHtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIlNob3dpbmcgZ2Vub21lIGNvbXBhcmlzb24gd2l0aCBoaXN0b3JpY2FsIGNhclwiKTtcbiAgXG4gIHZhciBtb2RhbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2Vub21lLXZpZXdlci1tb2RhbFwiKTtcbiAgdmFyIGNvbXBhcmlzb25Nb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb21wYXJpc29uLW1vZGVcIik7XG4gIFxuICAvLyBFbmFibGUgY29tcGFyaXNvbiBtb2RlXG4gIGNvbXBhcmlzb25Nb2RlLmNoZWNrZWQgPSB0cnVlO1xuICB0b2dnbGVDb21wYXJpc29uTW9kZSgpO1xuICBcbiAgLy8gU2hvdyBsZWFkZXIgZ2Vub21lXG4gIHZhciBsZWFkZXJHZW5vbWUgPSB3aW5kb3cuZ2V0Q3VycmVudExlYWRlckdlbm9tZSgpO1xuICBpZiAobGVhZGVyR2Vub21lICYmIGxlYWRlckdlbm9tZS5nZW5vbWUpIHtcbiAgICBkaXNwbGF5R2Vub21lRGF0YShsZWFkZXJHZW5vbWUuZ2Vub21lLCBcImxlYWRlci1nZW5vbWUtZGF0YVwiKTtcbiAgICBkcmF3Q2FyVmlzdWFsaXphdGlvbihsZWFkZXJHZW5vbWUuZ2Vub21lLCBcImxlYWRlci1jYXItdmlzdWFsaXphdGlvblwiKTtcbiAgfVxuICBcbiAgLy8gU2hvdyBoaXN0b3JpY2FsIGdlbm9tZVxuICBpZiAoaGlzdG9yaWNhbENhckRhdGEgJiYgaGlzdG9yaWNhbENhckRhdGEuZGVmKSB7XG4gICAgZGlzcGxheUdlbm9tZURhdGEoaGlzdG9yaWNhbENhckRhdGEuZGVmLCBcImNvbXBhcmlzb24tZ2Vub21lLWRhdGFcIik7XG4gICAgZHJhd0NhclZpc3VhbGl6YXRpb24oaGlzdG9yaWNhbENhckRhdGEuZGVmLCBcImNvbXBhcmlzb24tY2FyLXZpc3VhbGl6YXRpb25cIik7XG4gICAgXG4gICAgdmFyIHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5vbWUtdGl0bGVcIik7XG4gICAgdGl0bGUudGV4dENvbnRlbnQgPSBgR2Vub21lIENvbXBhcmlzb24gKFNjb3JlOiAke01hdGgucm91bmQoaGlzdG9yaWNhbENhckRhdGEuc2NvcmUudiAqIDEwMCkgLyAxMDB9KWA7XG4gIH1cbiAgXG4gIG1vZGFsLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG59XG5cbmZ1bmN0aW9uIGNsb3NlR2Vub21lVmlld2VyKCkge1xuICB2YXIgbW9kYWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdlbm9tZS12aWV3ZXItbW9kYWxcIik7XG4gIG1vZGFsLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIkdlbm9tZSB2aWV3ZXIgY2xvc2VkXCIpO1xufVxuXG5mdW5jdGlvbiB0b2dnbGVDb21wYXJpc29uTW9kZSgpIHtcbiAgdmFyIGNvbXBhcmlzb25Nb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb21wYXJpc29uLW1vZGVcIik7XG4gIHZhciBoaXN0b3JpY2FsU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoaXN0b3JpY2FsLWNhci1zZWxlY3RcIik7XG4gIHZhciBjb21wYXJpc29uQ29sdW1uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb21wYXJpc29uLWdlbm9tZVwiKTtcbiAgXG4gIGlmIChjb21wYXJpc29uTW9kZS5jaGVja2VkKSB7XG4gICAgaGlzdG9yaWNhbFNlbGVjdC5zdHlsZS5kaXNwbGF5ID0gXCJpbmxpbmVcIjtcbiAgICBjb21wYXJpc29uQ29sdW1uLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgcG9wdWxhdGVIaXN0b3JpY2FsQ2FyU2VsZWN0KCk7XG4gIH0gZWxzZSB7XG4gICAgaGlzdG9yaWNhbFNlbGVjdC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgY29tcGFyaXNvbkNvbHVtbi5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gIH1cbn1cblxuZnVuY3Rpb24gcG9wdWxhdGVIaXN0b3JpY2FsQ2FyU2VsZWN0KCkge1xuICB2YXIgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoaXN0b3JpY2FsLWNhci1zZWxlY3RcIik7XG4gIHNlbGVjdC5pbm5lckhUTUwgPSBcIjxvcHRpb24gdmFsdWU9Jyc+U2VsZWN0IGEgY2FyLi4uPC9vcHRpb24+XCI7XG4gIFxuICAvLyBHZXQgaGlzdG9yaWNhbCBjYXJzIGZyb20gdGhlIGdyYXBoU3RhdGUgaWYgYXZhaWxhYmxlXG4gIGlmICh3aW5kb3cuZ3JhcGhTdGF0ZSAmJiB3aW5kb3cuZ3JhcGhTdGF0ZS5jd190b3BDYXJzV2l0aEdlbm9tZSkge1xuICAgIHZhciB0b3BDYXJzID0gd2luZG93LmdyYXBoU3RhdGUuY3dfdG9wQ2Fyc1dpdGhHZW5vbWUuc2xpY2UoKTtcbiAgICBcbiAgICAvLyBTb3J0IGJ5IHNjb3JlIGRlc2NlbmRpbmdcbiAgICB0b3BDYXJzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgcmV0dXJuIGIuc2NvcmUudiAtIGEuc2NvcmUudjtcbiAgICB9KTtcbiAgICBcbiAgICB0b3BDYXJzLnNsaWNlKDAsIDEwKS5mb3JFYWNoKGZ1bmN0aW9uKGNhckRhdGEsIGluZGV4KSB7XG4gICAgICB2YXIgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9wdGlvblwiKTtcbiAgICAgIG9wdGlvbi52YWx1ZSA9IGluZGV4O1xuICAgICAgb3B0aW9uLnRleHRDb250ZW50ID0gYCMke2luZGV4ICsgMX06ICR7TWF0aC5yb3VuZChjYXJEYXRhLnNjb3JlLnYgKiAxMDApIC8gMTAwfSAoR2VuICR7Y2FyRGF0YS5zY29yZS5pfSlgO1xuICAgICAgb3B0aW9uLmNhckRhdGEgPSBjYXJEYXRhO1xuICAgICAgc2VsZWN0LmFwcGVuZENoaWxkKG9wdGlvbik7XG4gICAgfSk7XG4gICAgXG4gICAgc2VsZWN0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZWN0ZWRPcHRpb24gPSB0aGlzLm9wdGlvbnNbdGhpcy5zZWxlY3RlZEluZGV4XTtcbiAgICAgIGlmIChzZWxlY3RlZE9wdGlvbi5jYXJEYXRhKSB7XG4gICAgICAgIHNob3dHZW5vbWVDb21wYXJpc29uKHNlbGVjdGVkT3B0aW9uLmNhckRhdGEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUxlYWRlckdlbm9tZVZpZXcobmV3TGVhZGVyR2Vub21lKSB7XG4gIHZhciBtb2RhbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2Vub21lLXZpZXdlci1tb2RhbFwiKTtcbiAgXG4gIC8vIE9ubHkgdXBkYXRlIGlmIHRoZSBnZW5vbWUgdmlld2VyIGlzIGN1cnJlbnRseSBvcGVuXG4gIGlmIChtb2RhbC5zdHlsZS5kaXNwbGF5ID09PSBcImJsb2NrXCIpIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLklORk8sIFwiVXBkYXRpbmcgbGVhZGVyIGdlbm9tZSB2aWV3IGZvciBjYXI6XCIsIG5ld0xlYWRlckdlbm9tZS5jYXJJbmRleCk7XG4gICAgXG4gICAgdmFyIHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5vbWUtdGl0bGVcIik7XG4gICAgdGl0bGUudGV4dENvbnRlbnQgPSBgQ3VycmVudCBMZWFkZXIgR2Vub21lIChDYXIgIyR7bmV3TGVhZGVyR2Vub21lLmNhckluZGV4fSlgO1xuICAgIFxuICAgIGRpc3BsYXlHZW5vbWVEYXRhKG5ld0xlYWRlckdlbm9tZS5nZW5vbWUsIFwibGVhZGVyLWdlbm9tZS1kYXRhXCIpO1xuICAgIGRyYXdDYXJWaXN1YWxpemF0aW9uKG5ld0xlYWRlckdlbm9tZS5nZW5vbWUsIFwibGVhZGVyLWNhci12aXN1YWxpemF0aW9uXCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRpc3BsYXlHZW5vbWVEYXRhKGdlbm9tZSwgY29udGFpbmVySWQpIHtcbiAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbnRhaW5lcklkKTtcbiAgaWYgKCFjb250YWluZXIgfHwgIWdlbm9tZSkgcmV0dXJuO1xuICBcbiAgdmFyIGh0bWwgPSBcIlwiO1xuICBcbiAgLy8gV2hlZWwgcHJvcGVydGllc1xuICBpZiAoZ2Vub21lLndoZWVsX3JhZGl1cyAmJiBnZW5vbWUud2hlZWxfZGVuc2l0eSAmJiBnZW5vbWUud2hlZWxfdmVydGV4KSB7XG4gICAgaHRtbCArPSBcIjxkaXYgY2xhc3M9J2dlbm9tZS1wcm9wZXJ0eSc+XCI7XG4gICAgaHRtbCArPSBcIjxsYWJlbD5XaGVlbHMgKFwiICsgZ2Vub21lLndoZWVsX3JhZGl1cy5sZW5ndGggKyBcIik6PC9sYWJlbD5cIjtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlbm9tZS53aGVlbF9yYWRpdXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGh0bWwgKz0gXCI8ZGl2IHN0eWxlPSdtYXJnaW46IDVweCAwOyBwYWRkaW5nOiA1cHg7IGJhY2tncm91bmQ6IHZhcigtLWJnLXByaW1hcnkpOyBib3JkZXItcmFkaXVzOiAzcHg7Jz5cIjtcbiAgICAgIGh0bWwgKz0gXCI8c3Ryb25nPldoZWVsIFwiICsgKGkgKyAxKSArIFwiOjwvc3Ryb25nPjxicj5cIjtcbiAgICAgIGh0bWwgKz0gXCI8c3BhbiBjbGFzcz0nZ2Vub21lLXZhbHVlJz5SYWRpdXM6IFwiICsgKE1hdGgucm91bmQoZ2Vub21lLndoZWVsX3JhZGl1c1tpXSAqIDEwMCkgLyAxMDApICsgXCI8L3NwYW4+PGJyPlwiO1xuICAgICAgaHRtbCArPSBcIjxzcGFuIGNsYXNzPSdnZW5vbWUtdmFsdWUnPkRlbnNpdHk6IFwiICsgKE1hdGgucm91bmQoZ2Vub21lLndoZWVsX2RlbnNpdHlbaV0gKiAxMDApIC8gMTAwKSArIFwiPC9zcGFuPjxicj5cIjtcbiAgICAgIGh0bWwgKz0gXCI8c3BhbiBjbGFzcz0nZ2Vub21lLXZhbHVlJz5Qb3NpdGlvbjogVmVydGV4IFwiICsgKGdlbm9tZS53aGVlbF92ZXJ0ZXhbaV0gKyAxKSArIFwiPC9zcGFuPlwiO1xuICAgICAgaHRtbCArPSBcIjwvZGl2PlwiO1xuICAgIH1cbiAgICBodG1sICs9IFwiPC9kaXY+XCI7XG4gIH1cbiAgXG4gIC8vIENoYXNzaXMgZGVuc2l0eVxuICBpZiAoZ2Vub21lLmNoYXNzaXNfZGVuc2l0eSkge1xuICAgIGh0bWwgKz0gXCI8ZGl2IGNsYXNzPSdnZW5vbWUtcHJvcGVydHknPlwiO1xuICAgIGh0bWwgKz0gXCI8bGFiZWw+Q2hhc3NpcyBEZW5zaXR5OjwvbGFiZWw+XCI7XG4gICAgaHRtbCArPSBcIjxzcGFuIGNsYXNzPSdnZW5vbWUtdmFsdWUnPlwiICsgKE1hdGgucm91bmQoZ2Vub21lLmNoYXNzaXNfZGVuc2l0eVswXSAqIDEwMCkgLyAxMDApICsgXCI8L3NwYW4+XCI7XG4gICAgaHRtbCArPSBcIjwvZGl2PlwiO1xuICB9XG4gIFxuICAvLyBDaGFzc2lzIHNoYXBlICh2ZXJ0aWNlcylcbiAgaWYgKGdlbm9tZS52ZXJ0ZXhfbGlzdCkge1xuICAgIGh0bWwgKz0gXCI8ZGl2IGNsYXNzPSdnZW5vbWUtcHJvcGVydHknPlwiO1xuICAgIGh0bWwgKz0gXCI8bGFiZWw+Q2hhc3NpcyBTaGFwZSAoMTIgdmVydGljZXMpOjwvbGFiZWw+XCI7XG4gICAgaHRtbCArPSBcIjxkaXYgc3R5bGU9J2Rpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsgZ2FwOiA1cHg7IG1hcmdpbi10b3A6IDVweDsnPlwiO1xuICAgIFxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgZ2Vub21lLnZlcnRleF9saXN0Lmxlbmd0aDsgaiArPSAyKSB7XG4gICAgICB2YXIgeCA9IE1hdGgucm91bmQoZ2Vub21lLnZlcnRleF9saXN0W2pdICogMTAwKSAvIDEwMDtcbiAgICAgIHZhciB5ID0gTWF0aC5yb3VuZChnZW5vbWUudmVydGV4X2xpc3RbaiArIDFdICogMTAwKSAvIDEwMDtcbiAgICAgIGh0bWwgKz0gXCI8ZGl2IHN0eWxlPSdiYWNrZ3JvdW5kOiB2YXIoLS1iZy1wcmltYXJ5KTsgcGFkZGluZzogM3B4OyBib3JkZXItcmFkaXVzOiAycHg7IGZvbnQtc2l6ZTogMTJweDsnPlwiO1xuICAgICAgaHRtbCArPSBcIjxzcGFuIGNsYXNzPSdnZW5vbWUtdmFsdWUnPlZcIiArIChqLzIgKyAxKSArIFwiOiAoXCIgKyB4ICsgXCIsIFwiICsgeSArIFwiKTwvc3Bhbj5cIjtcbiAgICAgIGh0bWwgKz0gXCI8L2Rpdj5cIjtcbiAgICB9XG4gICAgaHRtbCArPSBcIjwvZGl2PlwiO1xuICAgIGh0bWwgKz0gXCI8L2Rpdj5cIjtcbiAgfVxuICBcbiAgLy8gQ2FyIElEIGFuZCBhbmNlc3RyeSBpZiBhdmFpbGFibGVcbiAgaWYgKGdlbm9tZS5pZCkge1xuICAgIGh0bWwgKz0gXCI8ZGl2IGNsYXNzPSdnZW5vbWUtcHJvcGVydHknPlwiO1xuICAgIGh0bWwgKz0gXCI8bGFiZWw+Q2FyIElEOjwvbGFiZWw+XCI7XG4gICAgaHRtbCArPSBcIjxzcGFuIGNsYXNzPSdnZW5vbWUtdmFsdWUnPlwiICsgZ2Vub21lLmlkLnN1YnN0cmluZygwLCA4KSArIFwiLi4uPC9zcGFuPlwiO1xuICAgIGh0bWwgKz0gXCI8L2Rpdj5cIjtcbiAgfVxuICBcbiAgY29udGFpbmVyLmlubmVySFRNTCA9IGh0bWw7XG59XG5cbmZ1bmN0aW9uIGRyYXdDYXJWaXN1YWxpemF0aW9uKGdlbm9tZSwgY2FudmFzSWQpIHtcbiAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNhbnZhc0lkKTtcbiAgaWYgKCFjYW52YXMgfHwgIWdlbm9tZSkgcmV0dXJuO1xuICBcbiAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgdmFyIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG4gIFxuICAvLyBDbGVhciBjYW52YXNcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgXG4gIC8vIFNldCB1cCBjb29yZGluYXRlIHN5c3RlbSAoY2VudGVyIG9yaWdpbiwgc2NhbGUgdXApXG4gIGN0eC5zYXZlKCk7XG4gIGN0eC50cmFuc2xhdGUod2lkdGggLyAyLCBoZWlnaHQgLyAyKTtcbiAgY3R4LnNjYWxlKDMwLCAtMzApOyAvLyBTY2FsZSBhbmQgZmxpcCBZIGF4aXNcbiAgXG4gIC8vIEdldCB0aGVtZSBjb2xvcnNcbiAgdmFyIGlzRGFya01vZGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLXRoZW1lJykgPT09ICdkYXJrJztcbiAgdmFyIGNoYXNzaXNDb2xvciA9IGlzRGFya01vZGUgPyAnIzRhOTBlMicgOiAnIzNGNzJBRic7XG4gIHZhciB3aGVlbENvbG9yID0gaXNEYXJrTW9kZSA/ICcjZmY2YjZiJyA6ICcjQkU0NzQ3JztcbiAgXG4gIC8vIERyYXcgY2hhc3NpcyBpZiB2ZXJ0ZXggZGF0YSBleGlzdHNcbiAgaWYgKGdlbm9tZS52ZXJ0ZXhfbGlzdCAmJiBnZW5vbWUudmVydGV4X2xpc3QubGVuZ3RoID49IDEyKSB7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IGNoYXNzaXNDb2xvcjtcbiAgICBjdHguZmlsbFN0eWxlID0gY2hhc3Npc0NvbG9yICsgJzQwJzsgLy8gU2VtaS10cmFuc3BhcmVudFxuICAgIGN0eC5saW5lV2lkdGggPSAwLjA1O1xuICAgIFxuICAgIC8vIE1vdmUgdG8gZmlyc3QgdmVydGV4XG4gICAgY3R4Lm1vdmVUbyhnZW5vbWUudmVydGV4X2xpc3RbMF0sIGdlbm9tZS52ZXJ0ZXhfbGlzdFsxXSk7XG4gICAgXG4gICAgLy8gRHJhdyBsaW5lcyB0byBvdGhlciB2ZXJ0aWNlc1xuICAgIGZvciAodmFyIGkgPSAyOyBpIDwgZ2Vub21lLnZlcnRleF9saXN0Lmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICBjdHgubGluZVRvKGdlbm9tZS52ZXJ0ZXhfbGlzdFtpXSwgZ2Vub21lLnZlcnRleF9saXN0W2kgKyAxXSk7XG4gICAgfVxuICAgIFxuICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICBjdHguZmlsbCgpO1xuICAgIGN0eC5zdHJva2UoKTtcbiAgfVxuICBcbiAgLy8gRHJhdyB3aGVlbHNcbiAgaWYgKGdlbm9tZS53aGVlbF9yYWRpdXMgJiYgZ2Vub21lLndoZWVsX3ZlcnRleCAmJiBnZW5vbWUudmVydGV4X2xpc3QpIHtcbiAgICBjdHguZmlsbFN0eWxlID0gd2hlZWxDb2xvcjtcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSB3aGVlbENvbG9yO1xuICAgIGN0eC5saW5lV2lkdGggPSAwLjAzO1xuICAgIFxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgZ2Vub21lLndoZWVsX3JhZGl1cy5sZW5ndGg7IGorKykge1xuICAgICAgaWYgKGdlbm9tZS53aGVlbF92ZXJ0ZXhbal0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgdmVydGV4SW5kZXggPSBnZW5vbWUud2hlZWxfdmVydGV4W2pdICogMjtcbiAgICAgICAgaWYgKHZlcnRleEluZGV4IDwgZ2Vub21lLnZlcnRleF9saXN0Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICB2YXIgd2hlZWxYID0gZ2Vub21lLnZlcnRleF9saXN0W3ZlcnRleEluZGV4XTtcbiAgICAgICAgICB2YXIgd2hlZWxZID0gZ2Vub21lLnZlcnRleF9saXN0W3ZlcnRleEluZGV4ICsgMV07XG4gICAgICAgICAgdmFyIHJhZGl1cyA9IGdlbm9tZS53aGVlbF9yYWRpdXNbal07XG4gICAgICAgICAgXG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICAgIGN0eC5hcmMod2hlZWxYLCB3aGVlbFksIHJhZGl1cywgMCwgTWF0aC5QSSAqIDIpO1xuICAgICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICBjdHgucmVzdG9yZSgpO1xufSIsIlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXIpIHtcbiAgdmFyIG91dCA9IHtcbiAgICBjaGFzc2lzOiBnaG9zdF9nZXRfY2hhc3NpcyhjYXIuY2hhc3NpcyksXG4gICAgd2hlZWxzOiBbXSxcbiAgICBwb3M6IHt4OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLngsIHk6IGNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCkueX1cbiAgfTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhci53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXQud2hlZWxzW2ldID0gZ2hvc3RfZ2V0X3doZWVsKGNhci53aGVlbHNbaV0pO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZ2V0X2NoYXNzaXMoYykge1xuICB2YXIgZ2MgPSBbXTtcblxuICBmb3IgKHZhciBmID0gYy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcblxuICAgIHZhciBwID0ge1xuICAgICAgdnR4OiBbXSxcbiAgICAgIG51bTogMFxuICAgIH1cblxuICAgIHAubnVtID0gcy5tX3ZlcnRleENvdW50O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzLm1fdmVydGV4Q291bnQ7IGkrKykge1xuICAgICAgcC52dHgucHVzaChjLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzW2ldKSk7XG4gICAgfVxuXG4gICAgZ2MucHVzaChwKTtcbiAgfVxuXG4gIHJldHVybiBnYztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3doZWVsKHcpIHtcbiAgdmFyIGd3ID0gW107XG5cbiAgZm9yICh2YXIgZiA9IHcuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG5cbiAgICB2YXIgYyA9IHtcbiAgICAgIHBvczogdy5HZXRXb3JsZFBvaW50KHMubV9wKSxcbiAgICAgIHJhZDogcy5tX3JhZGl1cyxcbiAgICAgIGFuZzogdy5tX3N3ZWVwLmFcbiAgICB9XG5cbiAgICBndy5wdXNoKGMpO1xuICB9XG5cbiAgcmV0dXJuIGd3O1xufVxuIiwiXG52YXIgZ2hvc3RfZ2V0X2ZyYW1lID0gcmVxdWlyZShcIi4vY2FyLXRvLWdob3N0LmpzXCIpO1xuXG52YXIgZW5hYmxlX2dob3N0ID0gdHJ1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdob3N0X2NyZWF0ZV9yZXBsYXk6IGdob3N0X2NyZWF0ZV9yZXBsYXksXG4gIGdob3N0X2NyZWF0ZV9naG9zdDogZ2hvc3RfY3JlYXRlX2dob3N0LFxuICBnaG9zdF9wYXVzZTogZ2hvc3RfcGF1c2UsXG4gIGdob3N0X3Jlc3VtZTogZ2hvc3RfcmVzdW1lLFxuICBnaG9zdF9nZXRfcG9zaXRpb246IGdob3N0X2dldF9wb3NpdGlvbixcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXk6IGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5LFxuICBnaG9zdF9tb3ZlX2ZyYW1lOiBnaG9zdF9tb3ZlX2ZyYW1lLFxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lOiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lLFxuICBnaG9zdF9kcmF3X2ZyYW1lOiBnaG9zdF9kcmF3X2ZyYW1lLFxuICBnaG9zdF9yZXNldF9naG9zdDogZ2hvc3RfcmVzZXRfZ2hvc3Rcbn1cblxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX3JlcGxheSgpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBudW1fZnJhbWVzOiAwLFxuICAgIGZyYW1lczogW10sXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX2dob3N0KCkge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIHJlcGxheTogbnVsbCxcbiAgICBmcmFtZTogMCxcbiAgICBkaXN0OiAtMTAwXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGdob3N0LmZyYW1lID0gMDtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfcGF1c2UoZ2hvc3QpIHtcbiAgaWYgKGdob3N0ICE9IG51bGwpXG4gICAgZ2hvc3Qub2xkX2ZyYW1lID0gZ2hvc3QuZnJhbWU7XG4gIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfcmVzdW1lKGdob3N0KSB7XG4gIGlmIChnaG9zdCAhPSBudWxsKVxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3Qub2xkX2ZyYW1lO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5mcmFtZSA8IDApXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcbiAgcmV0dXJuIGZyYW1lLnBvcztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfY29tcGFyZV90b19yZXBsYXkocmVwbGF5LCBnaG9zdCwgbWF4KSB7XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBpZiAocmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGlmIChnaG9zdC5kaXN0IDwgbWF4KSB7XG4gICAgZ2hvc3QucmVwbGF5ID0gcmVwbGF5O1xuICAgIGdob3N0LmRpc3QgPSBtYXg7XG4gICAgZ2hvc3QuZnJhbWUgPSAwO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGdob3N0LmZyYW1lKys7XG4gIGlmIChnaG9zdC5mcmFtZSA+PSBnaG9zdC5yZXBsYXkubnVtX2ZyYW1lcylcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0LnJlcGxheS5udW1fZnJhbWVzIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShyZXBsYXksIGNhcikge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm47XG4gIGlmIChyZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgdmFyIGZyYW1lID0gZ2hvc3RfZ2V0X2ZyYW1lKGNhcik7XG4gIHJlcGxheS5mcmFtZXMucHVzaChmcmFtZSk7XG4gIHJlcGxheS5udW1fZnJhbWVzKys7XG59XG5cbmZ1bmN0aW9uIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKSB7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QuZnJhbWUgPCAwKVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0LnJlcGxheSA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcblxuICAvLyB3aGVlbCBzdHlsZVxuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmcmFtZS53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciB3IGluIGZyYW1lLndoZWVsc1tpXSkge1xuICAgICAgZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBmcmFtZS53aGVlbHNbaV1bd10ucG9zLCBmcmFtZS53aGVlbHNbaV1bd10ucmFkLCBmcmFtZS53aGVlbHNbaV1bd10uYW5nKTtcbiAgICB9XG4gIH1cblxuICAvLyBjaGFzc2lzIHN0eWxlXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBmb3IgKHZhciBjIGluIGZyYW1lLmNoYXNzaXMpXG4gICAgZ2hvc3RfZHJhd19wb2x5KGN0eCwgZnJhbWUuY2hhc3Npc1tjXS52dHgsIGZyYW1lLmNoYXNzaXNbY10ubnVtKTtcbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9kcmF3X3BvbHkoY3R4LCB2dHgsIG5fdnR4KSB7XG4gIGN0eC5tb3ZlVG8odnR4WzBdLngsIHZ0eFswXS55KTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XG4gICAgY3R4LmxpbmVUbyh2dHhbaV0ueCwgdnR4W2ldLnkpO1xuICB9XG4gIGN0eC5saW5lVG8odnR4WzBdLngsIHZ0eFswXS55KTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBjZW50ZXIsIHJhZGl1cywgYW5nbGUpIHtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKGNlbnRlci54LCBjZW50ZXIueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XG5cbiAgY3R4Lm1vdmVUbyhjZW50ZXIueCwgY2VudGVyLnkpO1xuICBjdHgubGluZVRvKGNlbnRlci54ICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpLCBjZW50ZXIueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XG5cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwiLyogZ2xvYmFscyBkb2N1bWVudCBwZXJmb3JtYW5jZSBsb2NhbFN0b3JhZ2UgYWxlcnQgY29uZmlybSBidG9hIEhUTUxEaXZFbGVtZW50ICovXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xuLy8gR2xvYmFsIFZhcnNcblxudmFyIHdvcmxkUnVuID0gcmVxdWlyZShcIi4vd29ybGQvcnVuLmpzXCIpO1xudmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xuXG52YXIgbWFuYWdlUm91bmQgPSByZXF1aXJlKFwiLi9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qc1wiKTtcblxudmFyIGdob3N0X2ZucyA9IHJlcXVpcmUoXCIuL2dob3N0L2luZGV4LmpzXCIpO1xuXG52YXIgZHJhd0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXIuanNcIik7XG52YXIgZ3JhcGhfZm5zID0gcmVxdWlyZShcIi4vZHJhdy9wbG90LWdyYXBocy5qc1wiKTtcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xudmFyIGN3X2NsZWFyR3JhcGhpY3MgPSBncmFwaF9mbnMuY2xlYXJHcmFwaGljcztcbnZhciBjd19kcmF3Rmxvb3IgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctZmxvb3IuanNcIik7XG52YXIgY3dfZHJhd1dhdGVyID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LXdhdGVyLmpzXCIpO1xuXG52YXIgZ2hvc3RfZHJhd19mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9kcmF3X2ZyYW1lO1xudmFyIGdob3N0X2NyZWF0ZV9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfZ2hvc3Q7XG52YXIgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9hZGRfcmVwbGF5X2ZyYW1lO1xudmFyIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5ID0gZ2hvc3RfZm5zLmdob3N0X2NvbXBhcmVfdG9fcmVwbGF5O1xudmFyIGdob3N0X2dldF9wb3NpdGlvbiA9IGdob3N0X2Zucy5naG9zdF9nZXRfcG9zaXRpb247XG52YXIgZ2hvc3RfbW92ZV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9tb3ZlX2ZyYW1lO1xudmFyIGdob3N0X3Jlc2V0X2dob3N0ID0gZ2hvc3RfZm5zLmdob3N0X3Jlc2V0X2dob3N0XG52YXIgZ2hvc3RfcGF1c2UgPSBnaG9zdF9mbnMuZ2hvc3RfcGF1c2U7XG52YXIgZ2hvc3RfcmVzdW1lID0gZ2hvc3RfZm5zLmdob3N0X3Jlc3VtZTtcbnZhciBnaG9zdF9jcmVhdGVfcmVwbGF5ID0gZ2hvc3RfZm5zLmdob3N0X2NyZWF0ZV9yZXBsYXk7XG5cbnZhciBjd19DYXIgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctY2FyLXN0YXRzLmpzXCIpO1xudmFyIGdlbm9tZVZpZXdlciA9IHJlcXVpcmUoXCIuL2dlbm9tZS12aWV3ZXIuanNcIik7XG52YXIgbG9nZ2VyID0gcmVxdWlyZShcIi4vbG9nZ2VyL2xvZ2dlci5qc1wiKTtcbnZhciBnaG9zdDtcbnZhciBjYXJNYXAgPSBuZXcgTWFwKCk7XG5cbnZhciBkb0RyYXcgPSB0cnVlO1xudmFyIGN3X3BhdXNlZCA9IGZhbHNlO1xuXG52YXIgYm94MmRmcHMgPSA2MDtcbnZhciBzY3JlZW5mcHMgPSA2MDtcbnZhciBza2lwVGlja3MgPSBNYXRoLnJvdW5kKDEwMDAgLyBib3gyZGZwcyk7XG52YXIgbWF4RnJhbWVTa2lwID0gc2tpcFRpY2tzICogMjtcblxuLy8gU3BlZWQgY29udHJvbFxudmFyIHNwZWVkTXVsdGlwbGllciA9IDEuMDsgLy8gRGVmYXVsdCB0byAxeCAobm9ybWFsIHNwZWVkKVxudmFyIGxhc3RGcmFtZVRpbWUgPSAwO1xudmFyIGZyYW1lRGVsYXkgPSAxMDAwIC8gNjA7IC8vIEJhc2UgZGVsYXkgZm9yIDYwIEZQU1xuXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluYm94XCIpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG5cbnZhciBjYW1lcmEgPSB7XG4gIHNwZWVkOiAwLjA1LFxuICBwb3M6IHtcbiAgICB4OiAwLCB5OiAwXG4gIH0sXG4gIHRhcmdldDogLTEsXG4gIHpvb206IDcwXG59XG5cbnZhciBtaW5pbWFwY2FtZXJhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwY2FtZXJhXCIpLnN0eWxlO1xudmFyIG1pbmltYXBob2xkZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI21pbmltYXBob2xkZXJcIik7XG5cbnZhciBtaW5pbWFwY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwXCIpO1xudmFyIG1pbmltYXBjdHggPSBtaW5pbWFwY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbnZhciBtaW5pbWFwc2NhbGUgPSAzO1xudmFyIG1pbmltYXBmb2dkaXN0YW5jZSA9IDA7XG52YXIgZm9nZGlzdGFuY2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBmb2dcIikuc3R5bGU7XG5cblxudmFyIGNhckNvbnN0YW50cyA9IGNhckNvbnN0cnVjdC5jYXJDb25zdGFudHMoKTtcblxuXG52YXIgbWF4X2Nhcl9oZWFsdGggPSBib3gyZGZwcyAqIDEwO1xuXG52YXIgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IG51bGw7XG5cbnZhciBkaXN0YW5jZU1ldGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkaXN0YW5jZW1ldGVyXCIpO1xudmFyIGhlaWdodE1ldGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWlnaHRtZXRlclwiKTtcblxudmFyIGxlYWRlclBvc2l0aW9uID0ge1xuICB4OiAwLCB5OiAwXG59XG5cbi8vIExlYWRlciBnZW5vbWUgdHJhY2tpbmdcbnZhciBjdXJyZW50TGVhZGVyR2Vub21lID0ge1xuICBjYXJJbmRleDogLTEsXG4gIGdlbm9tZTogbnVsbCxcbiAgdGltZXN0YW1wOiBudWxsXG59XG5cbm1pbmltYXBjYW1lcmEud2lkdGggPSAxMiAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcbm1pbmltYXBjYW1lcmEuaGVpZ2h0ID0gNiAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcblxuXG4vLyA9PT09PT09IFdPUkxEIFNUQVRFID09PT09PVxudmFyIGdlbmVyYXRpb25Db25maWcgPSByZXF1aXJlKFwiLi9nZW5lcmF0aW9uLWNvbmZpZ1wiKTtcblxuXG52YXIgd29ybGRfZGVmID0ge1xuICBncmF2aXR5OiBuZXcgYjJWZWMyKDAuMCwgLTkuODEpLFxuICBkb1NsZWVwOiB0cnVlLFxuICBmbG9vcnNlZWQ6IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpLFxuICB0aWxlRGltZW5zaW9uczogbmV3IGIyVmVjMigxLjUsIDAuMTUpLFxuICBtYXhGbG9vclRpbGVzOiAyMDAsXG4gIG11dGFibGVfZmxvb3I6IGZhbHNlLFxuICB3YXRlckVuYWJsZWQ6IHRydWUsXG4gIGJveDJkZnBzOiBib3gyZGZwcyxcbiAgbW90b3JTcGVlZDogMjAsXG4gIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcbiAgc2NoZW1hOiBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5zY2hlbWFcbn1cblxudmFyIGN3X2RlYWRDYXJzO1xudmFyIGdyYXBoU3RhdGUgPSB7XG4gIGN3X3RvcFNjb3JlczogW10sXG4gIGN3X3RvcENhcnNXaXRoR2Vub21lOiBbXSxcbiAgY3dfZ3JhcGhBdmVyYWdlOiBbXSxcbiAgY3dfZ3JhcGhFbGl0ZTogW10sXG4gIGN3X2dyYXBoVG9wOiBbXSxcbn07XG5cbmZ1bmN0aW9uIHJlc2V0R3JhcGhTdGF0ZSgpe1xuICBncmFwaFN0YXRlID0ge1xuICAgIGN3X3RvcFNjb3JlczogW10sXG4gICAgY3dfdG9wQ2Fyc1dpdGhHZW5vbWU6IFtdLFxuICAgIGN3X2dyYXBoQXZlcmFnZTogW10sXG4gICAgY3dfZ3JhcGhFbGl0ZTogW10sXG4gICAgY3dfZ3JhcGhUb3A6IFtdLFxuICB9O1xufVxuXG5cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxudmFyIGdlbmVyYXRpb25TdGF0ZTtcblxuLy8gPT09PT09PT0gQWN0aXZpdHkgU3RhdGUgPT09PVxudmFyIGN1cnJlbnRSdW5uZXI7XG52YXIgbG9vcHMgPSAwO1xudmFyIG5leHRHYW1lVGljayA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpO1xuXG5mdW5jdGlvbiBzaG93RGlzdGFuY2UoZGlzdGFuY2UsIGhlaWdodCkge1xuICBkaXN0YW5jZU1ldGVyLmlubmVySFRNTCA9IGRpc3RhbmNlICsgXCIgbWV0ZXJzPGJyIC8+XCI7XG4gIGhlaWdodE1ldGVyLmlubmVySFRNTCA9IGhlaWdodCArIFwiIG1ldGVyc1wiO1xuICBpZiAoZGlzdGFuY2UgPiBtaW5pbWFwZm9nZGlzdGFuY2UpIHtcbiAgICBmb2dkaXN0YW5jZS53aWR0aCA9IDgwMCAtIE1hdGgucm91bmQoZGlzdGFuY2UgKyAxNSkgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XG4gICAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gZGlzdGFuY2U7XG4gIH1cbn1cblxuXG5cbi8qID09PSBFTkQgQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vKiA9PT09IEdlbmVyYXRpb24gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmZ1bmN0aW9uIGN3X2dlbmVyYXRpb25aZXJvKCkge1xuXG4gIGdlbmVyYXRpb25TdGF0ZSA9IG1hbmFnZVJvdW5kLmdlbmVyYXRpb25aZXJvKGdlbmVyYXRpb25Db25maWcoKSk7XG59XG5cbmZ1bmN0aW9uIHJlc2V0Q2FyVUkoKXtcbiAgY3dfZGVhZENhcnMgPSAwO1xuICBsZWFkZXJQb3NpdGlvbiA9IHtcbiAgICB4OiAwLCB5OiAwXG4gIH07XG4gIFxuICAvLyBSZXNldCBsZWFkZXIgZ2Vub21lIHRyYWNraW5nXG4gIGN1cnJlbnRMZWFkZXJHZW5vbWUgPSB7XG4gICAgY2FySW5kZXg6IC0xLFxuICAgIGdlbm9tZTogbnVsbCxcbiAgICB0aW1lc3RhbXA6IG51bGxcbiAgfTtcbiAgXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlci50b1N0cmluZygpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwb3B1bGF0aW9uXCIpLmlubmVySFRNTCA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplLnRvU3RyaW5nKCk7XG59XG5cbi8qID09PT0gRU5EIEdlbnJhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09PSBEcmF3aW5nID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5mdW5jdGlvbiBjd19kcmF3U2NyZWVuKCkge1xuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcbiAgdmFyIHdhdGVyWm9uZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLndhdGVyWm9uZXM7XG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgY3R4LnNhdmUoKTtcbiAgY3dfc2V0Q2FtZXJhUG9zaXRpb24oKTtcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xuICB2YXIgY2FtZXJhX3kgPSBjYW1lcmEucG9zLnk7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGN0eC50cmFuc2xhdGUoMjAwIC0gKGNhbWVyYV94ICogem9vbSksIDIwMCArIChjYW1lcmFfeSAqIHpvb20pKTtcbiAgY3R4LnNjYWxlKHpvb20sIC16b29tKTtcbiAgY3dfZHJhd0Zsb29yKGN0eCwgY2FtZXJhLCBmbG9vclRpbGVzKTtcbiAgY3dfZHJhd1dhdGVyKGN0eCwgY2FtZXJhLCB3YXRlclpvbmVzKTtcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0LCBjYW1lcmEpO1xuICBjd19kcmF3Q2FycygpO1xuICBjdHgucmVzdG9yZSgpO1xufVxuXG5mdW5jdGlvbiBjd19taW5pbWFwQ2FtZXJhKC8qIHgsIHkqLykge1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLnhcbiAgdmFyIGNhbWVyYV95ID0gY2FtZXJhLnBvcy55XG4gIG1pbmltYXBjYW1lcmEubGVmdCA9IE1hdGgucm91bmQoKDIgKyBjYW1lcmFfeCkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xuICBtaW5pbWFwY2FtZXJhLnRvcCA9IE1hdGgucm91bmQoKDMxIC0gY2FtZXJhX3kpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcbn1cblxuZnVuY3Rpb24gY3dfc2V0Q2FtZXJhVGFyZ2V0KGspIHtcbiAgY2FtZXJhLnRhcmdldCA9IGs7XG59XG5cbmZ1bmN0aW9uIGN3X3NldENhbWVyYVBvc2l0aW9uKCkge1xuICB2YXIgY2FtZXJhVGFyZ2V0UG9zaXRpb25cbiAgaWYgKGNhbWVyYS50YXJnZXQgIT09IC0xKSB7XG4gICAgY2FtZXJhVGFyZ2V0UG9zaXRpb24gPSBjYXJNYXAuZ2V0KGNhbWVyYS50YXJnZXQpLmdldFBvc2l0aW9uKCk7XG4gIH0gZWxzZSB7XG4gICAgY2FtZXJhVGFyZ2V0UG9zaXRpb24gPSBsZWFkZXJQb3NpdGlvbjtcbiAgfVxuICB2YXIgZGlmZl95ID0gY2FtZXJhLnBvcy55IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueTtcbiAgdmFyIGRpZmZfeCA9IGNhbWVyYS5wb3MueCAtIGNhbWVyYVRhcmdldFBvc2l0aW9uLng7XG4gIGNhbWVyYS5wb3MueSAtPSBjYW1lcmEuc3BlZWQgKiBkaWZmX3k7XG4gIGNhbWVyYS5wb3MueCAtPSBjYW1lcmEuc3BlZWQgKiBkaWZmX3g7XG4gIGN3X21pbmltYXBDYW1lcmEoY2FtZXJhLnBvcy54LCBjYW1lcmEucG9zLnkpO1xufVxuXG5mdW5jdGlvbiBjd19kcmF3R2hvc3RSZXBsYXkoKSB7XG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xuICB2YXIgd2F0ZXJab25lcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUud2F0ZXJab25lcztcbiAgdmFyIGNhclBvc2l0aW9uID0gZ2hvc3RfZ2V0X3Bvc2l0aW9uKGdob3N0KTtcbiAgY2FtZXJhLnBvcy54ID0gY2FyUG9zaXRpb24ueDtcbiAgY2FtZXJhLnBvcy55ID0gY2FyUG9zaXRpb24ueTtcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XG4gIHNob3dEaXN0YW5jZShcbiAgICBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxuICAgIE1hdGgucm91bmQoY2FyUG9zaXRpb24ueSAqIDEwMCkgLyAxMDBcbiAgKTtcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICBjdHguc2F2ZSgpO1xuICBjdHgudHJhbnNsYXRlKFxuICAgIDIwMCAtIChjYXJQb3NpdGlvbi54ICogY2FtZXJhLnpvb20pLFxuICAgIDIwMCArIChjYXJQb3NpdGlvbi55ICogY2FtZXJhLnpvb20pXG4gICk7XG4gIGN0eC5zY2FsZShjYW1lcmEuem9vbSwgLWNhbWVyYS56b29tKTtcbiAgY3dfZHJhd0Zsb29yKGN0eCwgY2FtZXJhLCBmbG9vclRpbGVzKTtcbiAgY3dfZHJhd1dhdGVyKGN0eCwgY2FtZXJhLCB3YXRlclpvbmVzKTtcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0KTtcbiAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XG4gIGN0eC5yZXN0b3JlKCk7XG59XG5cblxuZnVuY3Rpb24gY3dfZHJhd0NhcnMoKSB7XG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcbiAgZm9yICh2YXIgayA9IChjd19jYXJBcnJheS5sZW5ndGggLSAxKTsgayA+PSAwOyBrLS0pIHtcbiAgICB2YXIgbXlDYXIgPSBjd19jYXJBcnJheVtrXTtcbiAgICBkcmF3Q2FyKGNhckNvbnN0YW50cywgbXlDYXIsIGNhbWVyYSwgY3R4KVxuICB9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZURpc3BsYXkoKSB7XG4gIGNhbnZhcy53aWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgaWYgKGRvRHJhdykge1xuICAgIGRvRHJhdyA9IGZhbHNlO1xuICAgIGN3X3N0b3BTaW11bGF0aW9uKCk7XG4gICAgY3dfcnVubmluZ0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSArICgxMDAwIC8gc2NyZWVuZnBzKTtcbiAgICAgIHdoaWxlICh0aW1lID4gcGVyZm9ybWFuY2Uubm93KCkpIHtcbiAgICAgICAgc2ltdWxhdGlvblN0ZXAoKTtcbiAgICAgIH1cbiAgICB9LCAxKTtcbiAgfSBlbHNlIHtcbiAgICBkb0RyYXcgPSB0cnVlO1xuICAgIGNsZWFySW50ZXJ2YWwoY3dfcnVubmluZ0ludGVydmFsKTtcbiAgICBjd19zdGFydFNpbXVsYXRpb24oKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19kcmF3TWluaU1hcCgpIHtcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xuICBtaW5pbWFwZm9nZGlzdGFuY2UgPSAwO1xuICBmb2dkaXN0YW5jZS53aWR0aCA9IFwiODAwcHhcIjtcbiAgbWluaW1hcGNhbnZhcy53aWR0aCA9IG1pbmltYXBjYW52YXMud2lkdGg7XG4gIG1pbmltYXBjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgbWluaW1hcGN0eC5iZWdpblBhdGgoKTtcbiAgbWluaW1hcGN0eC5tb3ZlVG8oMCwgMzUgKiBtaW5pbWFwc2NhbGUpO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGZsb29yVGlsZXMubGVuZ3RoOyBrKyspIHtcbiAgICBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW2tdO1xuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcbiAgICB2YXIgbGFzdF93b3JsZF9jb29yZHMgPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcbiAgICB0aWxlX3Bvc2l0aW9uID0gbGFzdF93b3JsZF9jb29yZHM7XG4gICAgbWluaW1hcGN0eC5saW5lVG8oKHRpbGVfcG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlLCAoLXRpbGVfcG9zaXRpb24ueSArIDM1KSAqIG1pbmltYXBzY2FsZSk7XG4gIH1cbiAgbWluaW1hcGN0eC5zdHJva2UoKTtcbn1cblxuLyogPT09PSBFTkQgRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xudmFyIHVpTGlzdGVuZXJzID0ge1xuICBwcmVDYXJTdGVwOiBmdW5jdGlvbigpe1xuICAgIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xuICB9LFxuICBjYXJTdGVwKGNhcil7XG4gICAgdXBkYXRlQ2FyVUkoY2FyKTtcbiAgfSxcbiAgY2FyRGVhdGgoY2FySW5mbyl7XG5cbiAgICB2YXIgayA9IGNhckluZm8uaW5kZXg7XG5cbiAgICB2YXIgY2FyID0gY2FySW5mby5jYXIsIHNjb3JlID0gY2FySW5mby5zY29yZTtcbiAgICBjYXJNYXAuZ2V0KGNhckluZm8pLmtpbGwoY3VycmVudFJ1bm5lciwgd29ybGRfZGVmKTtcblxuICAgIC8vIHJlZm9jdXMgY2FtZXJhIHRvIGxlYWRlciBvbiBkZWF0aFxuICAgIGlmIChjYW1lcmEudGFyZ2V0ID09IGNhckluZm8pIHtcbiAgICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKHNjb3JlKTtcbiAgICBjYXJNYXAuZGVsZXRlKGNhckluZm8pO1xuICAgIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5KGNhci5yZXBsYXksIGdob3N0LCBzY29yZS52KTtcbiAgICBzY29yZS5pID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XG5cbiAgICBjd19kZWFkQ2FycysrO1xuICAgIHZhciBnZW5lcmF0aW9uU2l6ZSA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9wdWxhdGlvblwiKS5pbm5lckhUTUwgPSAoZ2VuZXJhdGlvblNpemUgLSBjd19kZWFkQ2FycykudG9TdHJpbmcoKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKGxlYWRlclBvc2l0aW9uLmxlYWRlciwgaylcbiAgICBpZiAobGVhZGVyUG9zaXRpb24ubGVhZGVyID09IGspIHtcbiAgICAgIC8vIGxlYWRlciBpcyBkZWFkLCBmaW5kIG5ldyBsZWFkZXJcbiAgICAgIGN3X2ZpbmRMZWFkZXIoKTtcbiAgICB9XG4gIH0sXG4gIGdlbmVyYXRpb25FbmQocmVzdWx0cyl7XG4gICAgY2xlYW51cFJvdW5kKHJlc3VsdHMpO1xuICAgIHJldHVybiBjd19uZXdSb3VuZChyZXN1bHRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaW11bGF0aW9uU3RlcCgpIHsgIFxuICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcbiAgc2hvd0Rpc3RhbmNlKFxuICAgIE1hdGgucm91bmQobGVhZGVyUG9zaXRpb24ueCAqIDEwMCkgLyAxMDAsXG4gICAgTWF0aC5yb3VuZChsZWFkZXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxuICApO1xufVxuXG5mdW5jdGlvbiBnYW1lTG9vcChjdXJyZW50VGltZSkge1xuICBpZiAoIWxhc3RGcmFtZVRpbWUpIGxhc3RGcmFtZVRpbWUgPSBjdXJyZW50VGltZTtcbiAgXG4gIHZhciBkZWx0YVRpbWUgPSBjdXJyZW50VGltZSAtIGxhc3RGcmFtZVRpbWU7XG4gIHZhciB0YXJnZXREZWxheSA9IGZyYW1lRGVsYXkgLyBzcGVlZE11bHRpcGxpZXI7XG4gIFxuICBpZiAoZGVsdGFUaW1lID49IHRhcmdldERlbGF5KSB7XG4gICAgbG9vcHMgPSAwO1xuICAgIHdoaWxlICghY3dfcGF1c2VkICYmIChuZXcgRGF0ZSkuZ2V0VGltZSgpID4gbmV4dEdhbWVUaWNrICYmIGxvb3BzIDwgbWF4RnJhbWVTa2lwKSB7ICAgXG4gICAgICBuZXh0R2FtZVRpY2sgKz0gc2tpcFRpY2tzO1xuICAgICAgbG9vcHMrKztcbiAgICB9XG4gICAgXG4gICAgc2ltdWxhdGlvblN0ZXAoKTtcbiAgICBjd19kcmF3U2NyZWVuKCk7XG4gICAgXG4gICAgbGFzdEZyYW1lVGltZSA9IGN1cnJlbnRUaW1lO1xuICB9XG5cbiAgaWYoIWN3X3BhdXNlZCkgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUNhclVJKGNhckluZm8pe1xuICB2YXIgayA9IGNhckluZm8uaW5kZXg7XG4gIHZhciBjYXIgPSBjYXJNYXAuZ2V0KGNhckluZm8pO1xuICB2YXIgcG9zaXRpb24gPSBjYXIuZ2V0UG9zaXRpb24oKTtcblxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKGNhci5yZXBsYXksIGNhci5jYXIuY2FyKTtcbiAgY2FyLm1pbmltYXBtYXJrZXIuc3R5bGUubGVmdCA9IE1hdGgucm91bmQoKHBvc2l0aW9uLnggKyA1KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XG4gIGNhci5oZWFsdGhCYXIud2lkdGggPSBNYXRoLnJvdW5kKChjYXIuY2FyLnN0YXRlLmhlYWx0aCAvIG1heF9jYXJfaGVhbHRoKSAqIDEwMCkgKyBcIiVcIjtcbiAgaWYgKHBvc2l0aW9uLnggPiBsZWFkZXJQb3NpdGlvbi54KSB7XG4gICAgbGVhZGVyUG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICBsZWFkZXJQb3NpdGlvbi5sZWFkZXIgPSBrO1xuICAgIFxuICAgIC8vIFVwZGF0ZSBsZWFkZXIgZ2Vub21lIHRyYWNraW5nXG4gICAgY3VycmVudExlYWRlckdlbm9tZS5jYXJJbmRleCA9IGs7XG4gICAgY3VycmVudExlYWRlckdlbm9tZS5nZW5vbWUgPSBjYXJJbmZvLmRlZjtcbiAgICBjdXJyZW50TGVhZGVyR2Vub21lLnRpbWVzdGFtcCA9IERhdGUubm93KCk7XG4gICAgXG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIk5ldyBsZWFkZXIgZGV0ZWN0ZWQgLSBDYXIgI1wiICsgayArIFwiIGdlbm9tZSB0cmFja2VkXCIpO1xuICAgIFxuICAgIC8vIFRyaWdnZXIgZ2Vub21lIHZpZXcgdXBkYXRlIGlmIGl0J3Mgb3BlblxuICAgIGlmICh3aW5kb3cudXBkYXRlTGVhZGVyR2Vub21lVmlldykge1xuICAgICAgd2luZG93LnVwZGF0ZUxlYWRlckdlbm9tZVZpZXcoY3VycmVudExlYWRlckdlbm9tZSk7XG4gICAgfVxuICAgIFxuICAgIC8vIGNvbnNvbGUubG9nKFwibmV3IGxlYWRlcjogXCIsIGspO1xuICB9XG59XG5cbmZ1bmN0aW9uIGN3X2ZpbmRMZWFkZXIoKSB7XG4gIHZhciBsZWFkID0gMDtcbiAgdmFyIG5ld0xlYWRlckluZGV4ID0gLTE7XG4gIHZhciBuZXdMZWFkZXJDYXJJbmZvID0gbnVsbDtcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xuICBcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBjd19jYXJBcnJheS5sZW5ndGg7IGsrKykge1xuICAgIGlmICghY3dfY2FyQXJyYXlba10uYWxpdmUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgcG9zaXRpb24gPSBjd19jYXJBcnJheVtrXS5nZXRQb3NpdGlvbigpO1xuICAgIGlmIChwb3NpdGlvbi54ID4gbGVhZCkge1xuICAgICAgbGVhZCA9IHBvc2l0aW9uLng7XG4gICAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgICAgbGVhZGVyUG9zaXRpb24ubGVhZGVyID0gaztcbiAgICAgIG5ld0xlYWRlckluZGV4ID0gaztcbiAgICAgIG5ld0xlYWRlckNhckluZm8gPSBjd19jYXJBcnJheVtrXS5jYXI7XG4gICAgfVxuICB9XG4gIFxuICAvLyBVcGRhdGUgbGVhZGVyIGdlbm9tZSBpZiBsZWFkZXIgY2hhbmdlZFxuICBpZiAobmV3TGVhZGVySW5kZXggIT09IGN1cnJlbnRMZWFkZXJHZW5vbWUuY2FySW5kZXggJiYgbmV3TGVhZGVyQ2FySW5mbykge1xuICAgIGN1cnJlbnRMZWFkZXJHZW5vbWUuY2FySW5kZXggPSBuZXdMZWFkZXJJbmRleDtcbiAgICBjdXJyZW50TGVhZGVyR2Vub21lLmdlbm9tZSA9IG5ld0xlYWRlckNhckluZm8uZGVmO1xuICAgIGN1cnJlbnRMZWFkZXJHZW5vbWUudGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICBcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLklORk8sIFwiTGVhZGVyIGNoYW5nZWQgdmlhIGZpbmRMZWFkZXIgLSBDYXIgI1wiICsgbmV3TGVhZGVySW5kZXggKyBcIiBnZW5vbWUgdHJhY2tlZFwiKTtcbiAgICBcbiAgICAvLyBUcmlnZ2VyIGdlbm9tZSB2aWV3IHVwZGF0ZSBpZiBpdCdzIG9wZW5cbiAgICBpZiAod2luZG93LnVwZGF0ZUxlYWRlckdlbm9tZVZpZXcpIHtcbiAgICAgIHdpbmRvdy51cGRhdGVMZWFkZXJHZW5vbWVWaWV3KGN1cnJlbnRMZWFkZXJHZW5vbWUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmYXN0Rm9yd2FyZCgpe1xuICB2YXIgZ2VuID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XG4gIHdoaWxlKGdlbiA9PT0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXIpe1xuICAgIGN1cnJlbnRSdW5uZXIuc3RlcCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFudXBSb3VuZChyZXN1bHRzKXtcblxuICByZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoYS5zY29yZS52ID4gYi5zY29yZS52KSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDFcbiAgICB9XG4gIH0pXG4gIGdyYXBoU3RhdGUgPSBwbG90X2dyYXBocyhcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyYXBoY2FudmFzXCIpLFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wc2NvcmVzXCIpLFxuICAgIG51bGwsXG4gICAgZ3JhcGhTdGF0ZSxcbiAgICByZXN1bHRzXG4gICk7XG59XG5cbmZ1bmN0aW9uIGN3X25ld1JvdW5kKHJlc3VsdHMpIHtcbiAgY2FtZXJhLnBvcy54ID0gY2FtZXJhLnBvcy55ID0gMDtcbiAgY3dfc2V0Q2FtZXJhVGFyZ2V0KC0xKTtcblxuICBnZW5lcmF0aW9uU3RhdGUgPSBtYW5hZ2VSb3VuZC5uZXh0R2VuZXJhdGlvbihcbiAgICBnZW5lcmF0aW9uU3RhdGUsIHJlc3VsdHMsIGdlbmVyYXRpb25Db25maWcoKVxuICApO1xuICBpZiAod29ybGRfZGVmLm11dGFibGVfZmxvb3IpIHtcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxuICAgIGdob3N0ID0gbnVsbDtcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gUkUtRU5BQkxFIEdIT1NUXG4gICAgZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpO1xuICB9XG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XG4gIHNldHVwQ2FyVUkoKTtcbiAgY3dfZHJhd01pbmlNYXAoKTtcbiAgcmVzZXRDYXJVSSgpO1xufVxuXG5mdW5jdGlvbiBjd19zdGFydFNpbXVsYXRpb24oKSB7XG4gIGN3X3BhdXNlZCA9IGZhbHNlO1xuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcbn1cblxuZnVuY3Rpb24gY3dfc3RvcFNpbXVsYXRpb24oKSB7XG4gIGN3X3BhdXNlZCA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGN3X2NsZWFyUG9wdWxhdGlvbldvcmxkKCkge1xuICBjYXJNYXAuZm9yRWFjaChmdW5jdGlvbihjYXIpe1xuICAgIGNhci5raWxsKGN1cnJlbnRSdW5uZXIsIHdvcmxkX2RlZik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjd19yZXNldFBvcHVsYXRpb25VSSgpIHtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0aW9uXCIpLmlubmVySFRNTCA9IFwiXCI7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2Fyc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRvcHNjb3Jlc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xuICBjd19jbGVhckdyYXBoaWNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JhcGhjYW52YXNcIikpO1xuICByZXNldEdyYXBoU3RhdGUoKTtcbn1cblxuZnVuY3Rpb24gY3dfcmVzZXRXb3JsZCgpIHtcbiAgZG9EcmF3ID0gdHJ1ZTtcbiAgY3dfc3RvcFNpbXVsYXRpb24oKTtcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmV3c2VlZFwiKS52YWx1ZTtcbiAgY3dfY2xlYXJQb3B1bGF0aW9uV29ybGQoKTtcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKTtcblxuICBNYXRoLnNlZWRyYW5kb20oKTtcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKFxuICAgIHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzXG4gICk7XG5cbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcbiAgcmVzZXRDYXJVSSgpO1xuICBzZXR1cENhclVJKClcbiAgY3dfZHJhd01pbmlNYXAoKTtcblxuICBjd19zdGFydFNpbXVsYXRpb24oKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBDYXJVSSgpe1xuICBjdXJyZW50UnVubmVyLmNhcnMubWFwKGZ1bmN0aW9uKGNhckluZm8pe1xuICAgIHZhciBjYXIgPSBuZXcgY3dfQ2FyKGNhckluZm8sIGNhck1hcCk7XG4gICAgY2FyTWFwLnNldChjYXJJbmZvLCBjYXIpO1xuICAgIGNhci5yZXBsYXkgPSBnaG9zdF9jcmVhdGVfcmVwbGF5KCk7XG4gICAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShjYXIucmVwbGF5LCBjYXIuY2FyLmNhcik7XG4gIH0pXG59XG5cblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNmYXN0LWZvcndhcmRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIGZhc3RGb3J3YXJkKClcbn0pO1xuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3NhdmUtcHJvZ3Jlc3NcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIHNhdmVQcm9ncmVzcygpXG59KTtcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNyZXN0b3JlLXByb2dyZXNzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICByZXN0b3JlUHJvZ3Jlc3MoKVxufSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlLWRpc3BsYXlcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIHRvZ2dsZURpc3BsYXkoKVxufSlcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNuZXctcG9wdWxhdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKVxuICBjd19nZW5lcmF0aW9uWmVybygpO1xuICBnaG9zdCA9IGdob3N0X2NyZWF0ZV9naG9zdCgpO1xuICByZXNldENhclVJKCk7XG59KVxuXG5mdW5jdGlvbiBzYXZlUHJvZ3Jlc3MoKSB7XG4gIGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPSBKU09OLnN0cmluZ2lmeShnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbik7XG4gIGxvY2FsU3RvcmFnZS5jd19nZW5Db3VudGVyID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XG4gIGxvY2FsU3RvcmFnZS5jd19naG9zdCA9IEpTT04uc3RyaW5naWZ5KGdob3N0KTtcbiAgbG9jYWxTdG9yYWdlLmN3X3RvcFNjb3JlcyA9IEpTT04uc3RyaW5naWZ5KGdyYXBoU3RhdGUuY3dfdG9wU2NvcmVzKTtcbiAgbG9jYWxTdG9yYWdlLmN3X3RvcENhcnNXaXRoR2Vub21lID0gSlNPTi5zdHJpbmdpZnkoZ3JhcGhTdGF0ZS5jd190b3BDYXJzV2l0aEdlbm9tZSk7XG4gIGxvY2FsU3RvcmFnZS5jd19mbG9vclNlZWQgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xufVxuXG5mdW5jdGlvbiByZXN0b3JlUHJvZ3Jlc3MoKSB7XG4gIGlmICh0eXBlb2YgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9PSAndW5kZWZpbmVkJyB8fCBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID09IG51bGwpIHtcbiAgICBhbGVydChcIk5vIHNhdmVkIHByb2dyZXNzIGZvdW5kXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBjd19zdG9wU2ltdWxhdGlvbigpO1xuICBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbik7XG4gIGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyID0gbG9jYWxTdG9yYWdlLmN3X2dlbkNvdW50ZXI7XG4gIGdob3N0ID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfZ2hvc3QpO1xuICBncmFwaFN0YXRlLmN3X3RvcFNjb3JlcyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X3RvcFNjb3Jlcyk7XG4gIFxuICAvLyBSZXN0b3JlIGdlbm9tZSBkYXRhIGlmIGF2YWlsYWJsZSAoYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgaWYgKGxvY2FsU3RvcmFnZS5jd190b3BDYXJzV2l0aEdlbm9tZSkge1xuICAgIGdyYXBoU3RhdGUuY3dfdG9wQ2Fyc1dpdGhHZW5vbWUgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd190b3BDYXJzV2l0aEdlbm9tZSk7XG4gIH0gZWxzZSB7XG4gICAgZ3JhcGhTdGF0ZS5jd190b3BDYXJzV2l0aEdlbm9tZSA9IFtdO1xuICB9XG4gIFxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gbG9jYWxTdG9yYWdlLmN3X2Zsb29yU2VlZDtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXdzZWVkXCIpLnZhbHVlID0gd29ybGRfZGVmLmZsb29yc2VlZDtcblxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xuICBjd19kcmF3TWluaU1hcCgpO1xuICBNYXRoLnNlZWRyYW5kb20oKTtcblxuICByZXNldENhclVJKCk7XG4gIGN3X3N0YXJ0U2ltdWxhdGlvbigpO1xufVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NvbmZpcm0tcmVzZXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIGN3X2NvbmZpcm1SZXNldFdvcmxkKClcbn0pXG5cbmZ1bmN0aW9uIGN3X2NvbmZpcm1SZXNldFdvcmxkKCkge1xuICBpZiAoY29uZmlybSgnUmVhbGx5IHJlc2V0IHdvcmxkPycpKSB7XG4gICAgY3dfcmVzZXRXb3JsZCgpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vLyBnaG9zdCByZXBsYXkgc3R1ZmZcblxuXG5mdW5jdGlvbiBjd19wYXVzZVNpbXVsYXRpb24oKSB7XG4gIGN3X3BhdXNlZCA9IHRydWU7XG4gIGdob3N0X3BhdXNlKGdob3N0KTtcbn1cblxuZnVuY3Rpb24gY3dfcmVzdW1lU2ltdWxhdGlvbigpIHtcbiAgY3dfcGF1c2VkID0gZmFsc2U7XG4gIGdob3N0X3Jlc3VtZShnaG9zdCk7XG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xufVxuXG5mdW5jdGlvbiBjd19zdGFydEdob3N0UmVwbGF5KCkge1xuICBpZiAoIWRvRHJhdykge1xuICAgIHRvZ2dsZURpc3BsYXkoKTtcbiAgfVxuICBjd19wYXVzZVNpbXVsYXRpb24oKTtcbiAgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IHNldEludGVydmFsKGN3X2RyYXdHaG9zdFJlcGxheSwgTWF0aC5yb3VuZCgxMDAwIC8gc2NyZWVuZnBzKSk7XG59XG5cbmZ1bmN0aW9uIGN3X3N0b3BHaG9zdFJlcGxheSgpIHtcbiAgY2xlYXJJbnRlcnZhbChjd19naG9zdFJlcGxheUludGVydmFsKTtcbiAgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IG51bGw7XG4gIGN3X2ZpbmRMZWFkZXIoKTtcbiAgY2FtZXJhLnBvcy54ID0gbGVhZGVyUG9zaXRpb24ueDtcbiAgY2FtZXJhLnBvcy55ID0gbGVhZGVyUG9zaXRpb24ueTtcbiAgY3dfcmVzdW1lU2ltdWxhdGlvbigpO1xufVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3RvZ2dsZS1naG9zdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oZSl7XG4gIGN3X3RvZ2dsZUdob3N0UmVwbGF5KGUudGFyZ2V0KVxufSlcblxuZnVuY3Rpb24gY3dfdG9nZ2xlR2hvc3RSZXBsYXkoYnV0dG9uKSB7XG4gIGlmIChjd19naG9zdFJlcGxheUludGVydmFsID09IG51bGwpIHtcbiAgICBjd19zdGFydEdob3N0UmVwbGF5KCk7XG4gICAgYnV0dG9uLnZhbHVlID0gXCJSZXN1bWUgc2ltdWxhdGlvblwiO1xuICB9IGVsc2Uge1xuICAgIGN3X3N0b3BHaG9zdFJlcGxheSgpO1xuICAgIGJ1dHRvbi52YWx1ZSA9IFwiVmlldyB0b3AgcmVwbGF5XCI7XG4gIH1cbn1cbi8vIGdob3N0IHJlcGxheSBzdHVmZiBFTkRcblxuLy8gaW5pdGlhbCBzdHVmZiwgb25seSBjYWxsZWQgb25jZSAoaG9wZWZ1bGx5KVxuZnVuY3Rpb24gY3dfaW5pdCgpIHtcbiAgLy8gQ2hlY2sgZm9yIHN0b3JlZCB3aGVlbCBjb3VudCBhbmQgYXBwbHkgaXRcbiAgdmFyIHN0b3JlZFdoZWVsQ291bnQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnd2hlZWxDb3VudCcpO1xuICBpZiAoc3RvcmVkV2hlZWxDb3VudCkge1xuICAgIHZhciB3aGVlbENvdW50ID0gcGFyc2VJbnQoc3RvcmVkV2hlZWxDb3VudCwgMTApO1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiUmVzdG9yaW5nIHdoZWVsIGNvdW50IGZyb20gbG9jYWxTdG9yYWdlOlwiLCB3aGVlbENvdW50KTtcbiAgICBcbiAgICAvLyBVcGRhdGUgY2FyIGNvbnN0YW50c1xuICAgIHZhciBjdXJyZW50Q29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xuICAgIGN1cnJlbnRDb25zdGFudHMud2hlZWxDb3VudCA9IHdoZWVsQ291bnQ7XG4gICAgXG4gICAgLy8gUmVnZW5lcmF0ZSBzY2hlbWFcbiAgICB2YXIgbmV3U2NoZW1hID0gY2FyQ29uc3RydWN0LmdlbmVyYXRlU2NoZW1hKGN1cnJlbnRDb25zdGFudHMpO1xuICAgIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLnNjaGVtYSA9IG5ld1NjaGVtYTtcbiAgICB3b3JsZF9kZWYuc2NoZW1hID0gbmV3U2NoZW1hO1xuICAgIFxuICAgIC8vIFVwZGF0ZSB0aGUgc2VsZWN0IGVsZW1lbnQgdG8gbWF0Y2hcbiAgICB2YXIgd2hlZWxTZWxlY3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjd2hlZWxjb3VudCcpO1xuICAgIGlmICh3aGVlbFNlbGVjdCkge1xuICAgICAgd2hlZWxTZWxlY3QudmFsdWUgPSB3aGVlbENvdW50O1xuICAgIH1cbiAgfVxuICBcbiAgLy8gU3BlZWQgYWx3YXlzIHN0YXJ0cyBhdCBkZWZhdWx0ICgxeCkgLSBubyBsb2NhbFN0b3JhZ2UgcGVyc2lzdGVuY2VcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJTdGFydGluZyB3aXRoIGRlZmF1bHQgc2ltdWxhdGlvbiBzcGVlZDpcIiwgc3BlZWRNdWx0aXBsaWVyICsgXCJ4XCIpO1xuICBcbiAgLy8gQ2hlY2sgZm9yIHN0b3JlZCB3YXRlciBzZXR0aW5nIGFuZCBhcHBseSBpdFxuICB2YXIgc3RvcmVkV2F0ZXIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnd2F0ZXJFbmFibGVkJyk7XG4gIGlmIChzdG9yZWRXYXRlcikge1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiUmVzdG9yaW5nIHdhdGVyIHNldHRpbmcgZnJvbSBsb2NhbFN0b3JhZ2U6XCIsIHN0b3JlZFdhdGVyKTtcbiAgICB3b3JsZF9kZWYud2F0ZXJFbmFibGVkID0gKHN0b3JlZFdhdGVyID09PSBcImVuYWJsZWRcIik7XG4gICAgXG4gICAgLy8gVXBkYXRlIHRoZSBzZWxlY3QgZWxlbWVudCB0byBtYXRjaFxuICAgIHZhciB3YXRlclNlbGVjdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN3YXRlcicpO1xuICAgIGlmICh3YXRlclNlbGVjdCkge1xuICAgICAgd2F0ZXJTZWxlY3QudmFsdWUgPSBzdG9yZWRXYXRlcjtcbiAgICB9XG4gIH1cbiAgXG4gIC8vIGNsb25lIHNpbHZlciBkb3QgYW5kIGhlYWx0aCBiYXJcbiAgdmFyIG1tbSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdtaW5pbWFwbWFya2VyJylbMF07XG4gIHZhciBoYmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ2hlYWx0aGJhcicpWzBdO1xuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5lcmF0aW9uU2l6ZTtcblxuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcblxuICAgIC8vIG1pbmltYXAgbWFya2Vyc1xuICAgIHZhciBuZXdiYXIgPSBtbW0uY2xvbmVOb2RlKHRydWUpO1xuICAgIG5ld2Jhci5pZCA9IFwiYmFyXCIgKyBrO1xuICAgIG5ld2Jhci5zdHlsZS5wYWRkaW5nVG9wID0gayAqIDkgKyBcInB4XCI7XG4gICAgbWluaW1hcGhvbGRlci5hcHBlbmRDaGlsZChuZXdiYXIpO1xuXG4gICAgLy8gaGVhbHRoIGJhcnNcbiAgICB2YXIgbmV3aGVhbHRoID0gaGJhci5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgbmV3aGVhbHRoLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiRElWXCIpWzBdLmlkID0gXCJoZWFsdGhcIiArIGs7XG4gICAgbmV3aGVhbHRoLmNhcl9pbmRleCA9IGs7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIikuYXBwZW5kQ2hpbGQobmV3aGVhbHRoKTtcbiAgfVxuICBtbW0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChtbW0pO1xuICBoYmFyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoaGJhcik7XG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcbiAgcmVzZXRDYXJVSSgpO1xuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xuICBzZXR1cENhclVJKCk7XG4gIGN3X2RyYXdNaW5pTWFwKCk7XG4gIFxuICAvLyBJbml0aWFsaXplIGdlbm9tZSB2aWV3ZXJcbiAgZ2Vub21lVmlld2VyLmluaXRpYWxpemVHZW5vbWVWaWV3ZXIoKTtcbiAgXG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xuICBcbn1cblxuZnVuY3Rpb24gcmVsTW91c2VDb29yZHMoZXZlbnQpIHtcbiAgdmFyIHRvdGFsT2Zmc2V0WCA9IDA7XG4gIHZhciB0b3RhbE9mZnNldFkgPSAwO1xuICB2YXIgY2FudmFzWCA9IDA7XG4gIHZhciBjYW52YXNZID0gMDtcbiAgdmFyIGN1cnJlbnRFbGVtZW50ID0gdGhpcztcblxuICBkbyB7XG4gICAgdG90YWxPZmZzZXRYICs9IGN1cnJlbnRFbGVtZW50Lm9mZnNldExlZnQgLSBjdXJyZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xuICAgIHRvdGFsT2Zmc2V0WSArPSBjdXJyZW50RWxlbWVudC5vZmZzZXRUb3AgLSBjdXJyZW50RWxlbWVudC5zY3JvbGxUb3A7XG4gICAgY3VycmVudEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5vZmZzZXRQYXJlbnRcbiAgfVxuICB3aGlsZSAoY3VycmVudEVsZW1lbnQpO1xuXG4gIGNhbnZhc1ggPSBldmVudC5wYWdlWCAtIHRvdGFsT2Zmc2V0WDtcbiAgY2FudmFzWSA9IGV2ZW50LnBhZ2VZIC0gdG90YWxPZmZzZXRZO1xuXG4gIHJldHVybiB7eDogY2FudmFzWCwgeTogY2FudmFzWX1cbn1cbkhUTUxEaXZFbGVtZW50LnByb3RvdHlwZS5yZWxNb3VzZUNvb3JkcyA9IHJlbE1vdXNlQ29vcmRzO1xubWluaW1hcGhvbGRlci5vbmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHZhciBjb29yZHMgPSBtaW5pbWFwaG9sZGVyLnJlbE1vdXNlQ29vcmRzKGV2ZW50KTtcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xuICB2YXIgY2xvc2VzdCA9IHtcbiAgICB2YWx1ZTogY3dfY2FyQXJyYXlbMF0uY2FyLFxuICAgIGRpc3Q6IE1hdGguYWJzKCgoY3dfY2FyQXJyYXlbMF0uZ2V0UG9zaXRpb24oKS54ICsgNikgKiBtaW5pbWFwc2NhbGUpIC0gY29vcmRzLngpLFxuICAgIHg6IGN3X2NhckFycmF5WzBdLmdldFBvc2l0aW9uKCkueFxuICB9XG5cbiAgdmFyIG1heFggPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGN3X2NhckFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBvcyA9IGN3X2NhckFycmF5W2ldLmdldFBvc2l0aW9uKCk7XG4gICAgdmFyIGRpc3QgPSBNYXRoLmFicygoKHBvcy54ICsgNikgKiBtaW5pbWFwc2NhbGUpIC0gY29vcmRzLngpO1xuICAgIGlmIChkaXN0IDwgY2xvc2VzdC5kaXN0KSB7XG4gICAgICBjbG9zZXN0LnZhbHVlID0gY3dfY2FyQXJyYXkuY2FyO1xuICAgICAgY2xvc2VzdC5kaXN0ID0gZGlzdDtcbiAgICAgIGNsb3Nlc3QueCA9IHBvcy54O1xuICAgIH1cbiAgICBtYXhYID0gTWF0aC5tYXgocG9zLngsIG1heFgpO1xuICB9XG5cbiAgaWYgKGNsb3Nlc3QueCA9PSBtYXhYKSB7IC8vIGZvY3VzIG9uIGxlYWRlciBhZ2FpblxuICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XG4gIH0gZWxzZSB7XG4gICAgY3dfc2V0Q2FtZXJhVGFyZ2V0KGNsb3Nlc3QudmFsdWUpO1xuICB9XG59XG5cblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNtdXRhdGlvbnJhdGVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxuICBjd19zZXRNdXRhdGlvbihlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25zaXplXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0TXV0YXRpb25SYW5nZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmxvb3JcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxuICBjd19zZXRNdXRhYmxlRmxvb3IoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KTtcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmF2aXR5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0R3Jhdml0eShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZWxpdGVzaXplXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0RWxpdGVTaXplKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxufSlcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiN3aGVlbGNvdW50XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0V2hlZWxDb3VudChlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc3BlZWRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxuICBjd19zZXRTcGVlZChlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjd2F0ZXJcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxuICBjd19zZXRXYXRlcihlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmZ1bmN0aW9uIGN3X3NldE11dGF0aW9uKG11dGF0aW9uKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbl9tdXRhdGlvbiA9IHBhcnNlRmxvYXQobXV0YXRpb24pO1xufVxuXG5mdW5jdGlvbiBjd19zZXRNdXRhdGlvblJhbmdlKHJhbmdlKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLm11dGF0aW9uX3JhbmdlID0gcGFyc2VGbG9hdChyYW5nZSk7XG59XG5cbmZ1bmN0aW9uIGN3X3NldE11dGFibGVGbG9vcihjaG9pY2UpIHtcbiAgd29ybGRfZGVmLm11dGFibGVfZmxvb3IgPSAoY2hvaWNlID09IDEpO1xufVxuXG5mdW5jdGlvbiBjd19zZXRHcmF2aXR5KGNob2ljZSkge1xuICB3b3JsZF9kZWYuZ3Jhdml0eSA9IG5ldyBiMlZlYzIoMC4wLCAtcGFyc2VGbG9hdChjaG9pY2UpKTtcbiAgdmFyIHdvcmxkID0gY3VycmVudFJ1bm5lci5zY2VuZS53b3JsZFxuICAvLyBDSEVDSyBHUkFWSVRZIENIQU5HRVNcbiAgaWYgKHdvcmxkLkdldEdyYXZpdHkoKS55ICE9IHdvcmxkX2RlZi5ncmF2aXR5LnkpIHtcbiAgICB3b3JsZC5TZXRHcmF2aXR5KHdvcmxkX2RlZi5ncmF2aXR5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19zZXRFbGl0ZVNpemUoY2xvbmVzKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmNoYW1waW9uTGVuZ3RoID0gcGFyc2VJbnQoY2xvbmVzLCAxMCk7XG59XG5cbmZ1bmN0aW9uIGN3X3NldFNwZWVkKHNwZWVkKSB7XG4gIHZhciBuZXdTcGVlZCA9IHBhcnNlRmxvYXQoc3BlZWQpO1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNoYW5naW5nIHNpbXVsYXRpb24gc3BlZWQgdG86XCIsIG5ld1NwZWVkICsgXCJ4XCIpO1xuICBcbiAgc3BlZWRNdWx0aXBsaWVyID0gbmV3U3BlZWQ7XG4gIGxhc3RGcmFtZVRpbWUgPSAwOyAvLyBSZXNldCB0aW1pbmcgd2hlbiBzcGVlZCBjaGFuZ2VzXG4gIFxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIk5ldyBzaW11bGF0aW9uIHNwZWVkOlwiLCBzcGVlZE11bHRpcGxpZXIgKyBcInhcIik7XG59XG5cbmZ1bmN0aW9uIGN3X3NldFdhdGVyKHN0YXRlKSB7XG4gIHZhciB3YXRlckVuYWJsZWQgPSAoc3RhdGUgPT09IFwiZW5hYmxlZFwiKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDaGFuZ2luZyB3YXRlciBzZXR0aW5nIHRvOlwiLCB3YXRlckVuYWJsZWQgPyBcImVuYWJsZWRcIiA6IFwiZGlzYWJsZWRcIik7XG4gIFxuICB3b3JsZF9kZWYud2F0ZXJFbmFibGVkID0gd2F0ZXJFbmFibGVkO1xuICBcbiAgLy8gU3RvcmUgd2F0ZXIgc2V0dGluZyBpbiBsb2NhbFN0b3JhZ2UgZm9yIHBlcnNpc3RlbmNlXG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCd3YXRlckVuYWJsZWQnLCBzdGF0ZSk7XG4gIFxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIldhdGVyIHNldHRpbmcgd2lsbCB0YWtlIGVmZmVjdCBvbiBuZXh0IGdlbmVyYXRpb25cIik7XG59XG5cbmZ1bmN0aW9uIGN3X3NldFdoZWVsQ291bnQod2hlZWxDb3VudCkge1xuICB2YXIgbmV3V2hlZWxDb3VudCA9IHBhcnNlSW50KHdoZWVsQ291bnQsIDEwKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDaGFuZ2luZyB3aGVlbCBjb3VudCB0bzpcIiwgbmV3V2hlZWxDb3VudCk7XG4gIFxuICAvLyBTdG9yZSB0aGUgd2hlZWwgY291bnQgaW4gbG9jYWxTdG9yYWdlIHRvIHBlcnNpc3QgYWNyb3NzIHJlbG9hZHNcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3doZWVsQ291bnQnLCBuZXdXaGVlbENvdW50KTtcbiAgXG4gIC8vIFVwZGF0ZSB0aGUgY2FyIGNvbnN0YW50cyAgXG4gIHZhciBjdXJyZW50Q29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xuICBjdXJyZW50Q29uc3RhbnRzLndoZWVsQ291bnQgPSBuZXdXaGVlbENvdW50O1xuICBcbiAgLy8gUmVnZW5lcmF0ZSBzY2hlbWEgd2l0aCBuZXcgd2hlZWwgY291bnRcbiAgdmFyIG5ld1NjaGVtYSA9IGNhckNvbnN0cnVjdC5nZW5lcmF0ZVNjaGVtYShjdXJyZW50Q29uc3RhbnRzKTtcbiAgZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuc2NoZW1hID0gbmV3U2NoZW1hO1xuICB3b3JsZF9kZWYuc2NoZW1hID0gbmV3U2NoZW1hO1xuICBcbiAgLy8gU2ltcGxlIHJlc3RhcnQ6IHJlbG9hZCB0aGUgcGFnZSB0byBhdm9pZCBhbnkgc2NoZW1hIGNvbmZsaWN0c1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIlJlbG9hZGluZyBwYWdlIHRvIGFwcGx5IHdoZWVsIGNvdW50IGNoYW5nZS4uLlwiKTtcbiAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xufVxuXG5mdW5jdGlvbiBjd19jbGVhbnVwQWxsKCkge1xuICAvLyBDbGVhciBleGlzdGluZyBVSSBlbGVtZW50cyBjcmVhdGVkIGJ5IGN3X2luaXRcbiAgdHJ5IHtcbiAgICAvLyBDbGVhciBjYXItcmVsYXRlZCBVSVxuICAgIHZhciBjYXJzRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2Fyc1wiKTtcbiAgICBpZiAoY2Fyc0VsZW1lbnQpIHtcbiAgICAgIGNhcnNFbGVtZW50LmlubmVySFRNTCA9IFwiXCI7XG4gICAgfVxuICAgIFxuICAgIC8vIENsZWFyIGhlYWx0aCBjb250YWluZXIgKGJ1dCBwcmVzZXJ2ZSB0ZW1wbGF0ZSlcbiAgICB2YXIgaGVhbHRoQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIik7XG4gICAgaWYgKGhlYWx0aENvbnRhaW5lcikge1xuICAgICAgdmFyIGhlYWx0aEJhcnMgPSBoZWFsdGhDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmhlYWx0aGJhcjpub3QoW25hbWVdKScpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBoZWFsdGhCYXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGhlYWx0aEJhcnNbaV0ucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIENsZWFyIG1pbmltYXAgbWFya2VycyAoYnV0IHByZXNlcnZlIHRlbXBsYXRlKVxuICAgIHZhciBtaW5pbWFwaG9sZGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwaG9sZGVyXCIpO1xuICAgIGlmIChtaW5pbWFwaG9sZGVyKSB7XG4gICAgICB2YXIgbWFya2VycyA9IG1pbmltYXBob2xkZXIucXVlcnlTZWxlY3RvckFsbCgnW2lkXj1cImJhclwiXTpub3QoW25hbWVdKScpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXJrZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1hcmtlcnNbaV0ucmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFJlc2V0IGdyYXBoaWNzXG4gICAgaWYgKHR5cGVvZiBjd19jbGVhckdyYXBoaWNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjd19jbGVhckdyYXBoaWNzKCk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkNsZWFudXAgZXJyb3I6XCIsIGUpO1xuICB9XG59XG5cbi8vIERhcmsgbW9kZSBmdW5jdGlvbmFsaXR5XG5mdW5jdGlvbiB0b2dnbGVUaGVtZSgpIHtcbiAgdmFyIGN1cnJlbnRUaGVtZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGhlbWUnKTtcbiAgdmFyIG5ld1RoZW1lID0gY3VycmVudFRoZW1lID09PSAnZGFyaycgPyAnbGlnaHQnIDogJ2RhcmsnO1xuICB2YXIgdG9nZ2xlQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RoZW1lLXRvZ2dsZScpO1xuICBcbiAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS10aGVtZScsIG5ld1RoZW1lKTtcbiAgXG4gIGlmIChuZXdUaGVtZSA9PT0gJ2RhcmsnKSB7XG4gICAgdG9nZ2xlQnV0dG9uLnRleHRDb250ZW50ID0gJ+KYgO+4jyBMaWdodCBNb2RlJztcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgndGhlbWUnLCAnZGFyaycpO1xuICB9IGVsc2Uge1xuICAgIHRvZ2dsZUJ1dHRvbi50ZXh0Q29udGVudCA9ICfwn4yZIERhcmsgTW9kZSc7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3RoZW1lJywgJ2xpZ2h0Jyk7XG4gIH1cbn1cblxuLy8gSW5pdGlhbGl6ZSB0aGVtZSBmcm9tIGxvY2FsU3RvcmFnZVxuZnVuY3Rpb24gaW5pdGlhbGl6ZVRoZW1lKCkge1xuICB2YXIgc2F2ZWRUaGVtZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd0aGVtZScpIHx8ICdkYXJrJzsgLy8gRGVmYXVsdCB0byBkYXJrIG1vZGVcbiAgdmFyIHRvZ2dsZUJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0aGVtZS10b2dnbGUnKTtcbiAgXG4gIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdGhlbWUnLCBzYXZlZFRoZW1lKTtcbiAgXG4gIGlmIChzYXZlZFRoZW1lID09PSAnZGFyaycpIHtcbiAgICB0b2dnbGVCdXR0b24udGV4dENvbnRlbnQgPSAn4piA77iPIExpZ2h0IE1vZGUnO1xuICB9IGVsc2Uge1xuICAgIHRvZ2dsZUJ1dHRvbi50ZXh0Q29udGVudCA9ICfwn4yZIERhcmsgTW9kZSc7XG4gIH1cbn1cblxuLy8gTWFrZSBmdW5jdGlvbnMgYXZhaWxhYmxlIGdsb2JhbGx5XG53aW5kb3cudG9nZ2xlVGhlbWUgPSB0b2dnbGVUaGVtZTtcbndpbmRvdy5nZXRDdXJyZW50TGVhZGVyR2Vub21lID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBjdXJyZW50TGVhZGVyR2Vub21lO1xufTtcbndpbmRvdy5ncmFwaFN0YXRlID0gZ3JhcGhTdGF0ZTtcblxuY3dfaW5pdCgpO1xuXG4vLyBJbml0aWFsaXplIHRoZW1lIGFmdGVyIHBhZ2UgbG9hZFxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGluaXRpYWxpemVUaGVtZSk7XG4iLCJ2YXIgbG9nZ2VyID0ge1xuICBpbml0OiBpbml0LFxuICBsb2c6IGxvZyxcbiAgdGltZTogdGltZSxcbiAgdGltZUVuZDogdGltZUVuZCxcbiAgc2V0TGV2ZWw6IHNldExldmVsLFxuICBmcmFtZVN0YXJ0OiBmcmFtZVN0YXJ0LFxuICBmcmFtZUVuZDogZnJhbWVFbmQsXG4gIGdldFN0YXRzOiBnZXRTdGF0cyxcbiAgbG9nSGlzdG9yeVN0cmluZzogbG9nSGlzdG9yeVN0cmluZ1xufTtcblxuLy8gRXhwb3NlIGxvZ2dlciBnbG9iYWxseSBmb3IgY29uc29sZSBhY2Nlc3NcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICB3aW5kb3cuZ2FtZUxvZ2dlciA9IGxvZ2dlcjtcbiAgd2luZG93LmdldEdhbWVMb2dzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXRzOiBnZXRTdGF0cygpLFxuICAgICAgbG9nTGV2ZWxzOiBMT0dfTEVWRUxTLFxuICAgICAgY3VycmVudExldmVsOiBjdXJyZW50TGV2ZWwsXG4gICAgICByZWNlbnRGcmFtZVRpbWVzOiBmcmFtZVRpbWVzLnNsaWNlKC0xMCksXG4gICAgICBsb2dIaXN0b3J5OiBsb2dIaXN0b3J5LnNsaWNlKC0yMCksIC8vIExhc3QgMjAgbG9nIG1lc3NhZ2VzXG4gICAgICB3YXRlckxvZ3M6IGxvZ0hpc3RvcnkuZmlsdGVyKGxvZyA9PiBsb2cubWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd3YXRlcicpKSxcbiAgICAgIGNvbGxpc2lvbkxvZ3M6IGxvZ0hpc3RvcnkuZmlsdGVyKGxvZyA9PiBsb2cubWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjb2xsaXNpb24nKSksXG4gICAgICBsb2dIaXN0b3J5U3RyaW5nOiBsb2dIaXN0b3J5U3RyaW5nXG4gICAgfTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsb2dnZXI7XG5cbnZhciBMT0dfTEVWRUxTID0ge1xuICBFUlJPUjogMCxcbiAgV0FSTjogMSxcbiAgSU5GTzogMixcbiAgREVCVUc6IDNcbn07XG5cbnZhciBjdXJyZW50TGV2ZWwgPSBMT0dfTEVWRUxTLklORk87XG52YXIgZnJhbWVDb3VudCA9IDA7XG52YXIgZnJhbWVTdGFydFRpbWUgPSAwO1xudmFyIGZyYW1lVGltZXMgPSBbXTtcbnZhciBtYXhGcmFtZVRpbWVzID0gMTAwOyAvLyBLZWVwIGxhc3QgMTAwIGZyYW1lIHRpbWVzXG52YXIgdGltZXJzID0ge307XG52YXIgbG9nSGlzdG9yeSA9IFtdOyAvLyBTdG9yZSByZWNlbnQgbG9nIG1lc3NhZ2VzXG52YXIgbWF4TG9nSGlzdG9yeSA9IDEwMDsgLy8gS2VlcCBsYXN0IDEwMCBsb2cgbWVzc2FnZXNcbnZhciBzdGF0cyA9IHtcbiAgdG90YWxGcmFtZXM6IDAsXG4gIGF2Z0ZyYW1lVGltZTogMCxcbiAgbGFzdEZyYW1lVGltZTogMCxcbiAgY29sbGlzaW9uRXZlbnRzOiAwLFxuICB3YXRlckZvcmNlQXBwbGljYXRpb25zOiAwLFxuICBjYXJzSW5XYXRlcjogMFxufTtcblxuZnVuY3Rpb24gaW5pdChsZXZlbCkge1xuICBjdXJyZW50TGV2ZWwgPSBsZXZlbCB8fCBMT0dfTEVWRUxTLklORk87XG4gIGZyYW1lQ291bnQgPSAwO1xuICBzdGF0cyA9IHtcbiAgICB0b3RhbEZyYW1lczogMCxcbiAgICBhdmdGcmFtZVRpbWU6IDAsXG4gICAgbGFzdEZyYW1lVGltZTogMCxcbiAgICBjb2xsaXNpb25FdmVudHM6IDAsXG4gICAgd2F0ZXJGb3JjZUFwcGxpY2F0aW9uczogMCxcbiAgICBjYXJzSW5XYXRlcjogMFxuICB9O1xuICBsb2coTE9HX0xFVkVMUy5JTkZPLCBcIkRlYnVnIGxvZ2dlciBpbml0aWFsaXplZCBhdCBsZXZlbDpcIiwgT2JqZWN0LmtleXMoTE9HX0xFVkVMUylbY3VycmVudExldmVsXSk7XG59XG5cbmZ1bmN0aW9uIGxvZyhsZXZlbCwgLi4uYXJncykge1xuICBpZiAobGV2ZWwgPD0gY3VycmVudExldmVsKSB7XG4gICAgdmFyIHByZWZpeCA9IFwiW1wiICsgT2JqZWN0LmtleXMoTE9HX0xFVkVMUylbbGV2ZWxdICsgXCJdIEZyYW1lIFwiICsgZnJhbWVDb3VudCArIFwiOlwiO1xuICAgIHZhciBtZXNzYWdlID0gcHJlZml4ICsgXCIgXCIgKyBhcmdzLmpvaW4oXCIgXCIpO1xuICAgIFxuICAgIC8vIFN0b3JlIGluIGhpc3RvcnlcbiAgICBsb2dIaXN0b3J5LnB1c2goe1xuICAgICAgbGV2ZWw6IGxldmVsLFxuICAgICAgZnJhbWU6IGZyYW1lQ291bnQsXG4gICAgICBtZXNzYWdlOiBhcmdzLmpvaW4oXCIgXCIpLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgfSk7XG4gICAgXG4gICAgLy8gS2VlcCBoaXN0b3J5IHNpemUgbWFuYWdlYWJsZVxuICAgIGlmIChsb2dIaXN0b3J5Lmxlbmd0aCA+IG1heExvZ0hpc3RvcnkpIHtcbiAgICAgIGxvZ0hpc3Rvcnkuc2hpZnQoKTtcbiAgICB9XG4gICAgXG4gICAgY29uc29sZS5sb2cocHJlZml4LCAuLi5hcmdzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0aW1lKGxhYmVsKSB7XG4gIHRpbWVyc1tsYWJlbF0gPSBwZXJmb3JtYW5jZS5ub3coKTtcbn1cblxuZnVuY3Rpb24gdGltZUVuZChsYWJlbCkge1xuICBpZiAodGltZXJzW2xhYmVsXSkge1xuICAgIHZhciBlbGFwc2VkID0gcGVyZm9ybWFuY2Uubm93KCkgLSB0aW1lcnNbbGFiZWxdO1xuICAgIGxvZyhMT0dfTEVWRUxTLkRFQlVHLCBcIlRpbWVyXCIsIGxhYmVsICsgXCI6XCIsIGVsYXBzZWQudG9GaXhlZCgyKSArIFwibXNcIik7XG4gICAgZGVsZXRlIHRpbWVyc1tsYWJlbF07XG4gICAgcmV0dXJuIGVsYXBzZWQ7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIHNldExldmVsKGxldmVsKSB7XG4gIGN1cnJlbnRMZXZlbCA9IGxldmVsO1xuICBsb2coTE9HX0xFVkVMUy5JTkZPLCBcIkRlYnVnIGxldmVsIGNoYW5nZWQgdG86XCIsIE9iamVjdC5rZXlzKExPR19MRVZFTFMpW2xldmVsXSk7XG59XG5cbmZ1bmN0aW9uIGZyYW1lU3RhcnQoKSB7XG4gIGZyYW1lU3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIGZyYW1lQ291bnQrKztcbiAgc3RhdHMudG90YWxGcmFtZXMrKztcbiAgXG4gIC8vIFJlc2V0IHBlci1mcmFtZSBjb3VudGVyc1xuICBzdGF0cy5jb2xsaXNpb25FdmVudHMgPSAwO1xuICBzdGF0cy53YXRlckZvcmNlQXBwbGljYXRpb25zID0gMDtcbn1cblxuZnVuY3Rpb24gZnJhbWVFbmQoKSB7XG4gIGlmIChmcmFtZVN0YXJ0VGltZSA+IDApIHtcbiAgICB2YXIgZnJhbWVUaW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBmcmFtZVN0YXJ0VGltZTtcbiAgICBzdGF0cy5sYXN0RnJhbWVUaW1lID0gZnJhbWVUaW1lO1xuICAgIFxuICAgIGZyYW1lVGltZXMucHVzaChmcmFtZVRpbWUpO1xuICAgIGlmIChmcmFtZVRpbWVzLmxlbmd0aCA+IG1heEZyYW1lVGltZXMpIHtcbiAgICAgIGZyYW1lVGltZXMuc2hpZnQoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2FsY3VsYXRlIGF2ZXJhZ2VcbiAgICB2YXIgc3VtID0gZnJhbWVUaW1lcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKTtcbiAgICBzdGF0cy5hdmdGcmFtZVRpbWUgPSBzdW0gLyBmcmFtZVRpbWVzLmxlbmd0aDtcbiAgICBcbiAgICAvLyBMb2cgc2xvdyBmcmFtZXNcbiAgICBpZiAoZnJhbWVUaW1lID4gNTApIHsgLy8gTW9yZSB0aGFuIDUwbXMgPSBsZXNzIHRoYW4gMjBmcHNcbiAgICAgIGxvZyhMT0dfTEVWRUxTLldBUk4sIFwiU2xvdyBmcmFtZSBkZXRlY3RlZDpcIiwgZnJhbWVUaW1lLnRvRml4ZWQoMikgKyBcIm1zXCIpO1xuICAgIH1cbiAgICBcbiAgICAvLyBMb2cgZXZlcnkgNjAgZnJhbWVzXG4gICAgaWYgKGZyYW1lQ291bnQgJSA2MCA9PT0gMCkge1xuICAgICAgbG9nKExPR19MRVZFTFMuREVCVUcsIFwiRnJhbWUgc3RhdHMgLSBBdmc6XCIsIHN0YXRzLmF2Z0ZyYW1lVGltZS50b0ZpeGVkKDIpICsgXCJtc1wiLCBcbiAgICAgICAgICBcIkxhc3Q6XCIsIHN0YXRzLmxhc3RGcmFtZVRpbWUudG9GaXhlZCgyKSArIFwibXNcIiwgXG4gICAgICAgICAgXCJDb2xsaXNpb25zOlwiLCBzdGF0cy5jb2xsaXNpb25FdmVudHMsXG4gICAgICAgICAgXCJXYXRlciBmb3JjZXM6XCIsIHN0YXRzLndhdGVyRm9yY2VBcHBsaWNhdGlvbnMpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTdGF0cygpIHtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRzKTtcbn1cblxuLy8gR2xvYmFsIHN0YXRzIGluY3JlbWVudGVyc1xuZnVuY3Rpb24gaW5jcmVtZW50Q29sbGlzaW9uRXZlbnRzKCkge1xuICBzdGF0cy5jb2xsaXNpb25FdmVudHMrKztcbn1cblxuZnVuY3Rpb24gaW5jcmVtZW50V2F0ZXJGb3JjZXMoKSB7XG4gIHN0YXRzLndhdGVyRm9yY2VBcHBsaWNhdGlvbnMrKztcbn1cblxuZnVuY3Rpb24gc2V0Q2Fyc0luV2F0ZXIoY291bnQpIHtcbiAgc3RhdHMuY2Fyc0luV2F0ZXIgPSBjb3VudDtcbn1cblxuZnVuY3Rpb24gbG9nSGlzdG9yeVN0cmluZyhsaW5lcykge1xuICB2YXIgbnVtTGluZXMgPSBsaW5lcyB8fCAyMDtcbiAgdmFyIGxvZ3MgPSBsb2dIaXN0b3J5LnNsaWNlKC1udW1MaW5lcyk7XG4gIFxuICBpZiAobG9ncy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gXCJObyBsb2cgbWVzc2FnZXMgYXZhaWxhYmxlLlwiO1xuICB9XG4gIFxuICB2YXIgcmVzdWx0ID0gW107XG4gIHJlc3VsdC5wdXNoKFwiPT09IEdhbWUgTG9nIEhpc3RvcnkgKGxhc3QgXCIgKyBsb2dzLmxlbmd0aCArIFwiIG1lc3NhZ2VzKSA9PT1cIik7XG4gIFxuICBsb2dzLmZvckVhY2goZnVuY3Rpb24obG9nKSB7XG4gICAgdmFyIGxldmVsTmFtZSA9IE9iamVjdC5rZXlzKExPR19MRVZFTFMpW2xvZy5sZXZlbF0gfHwgXCJVTktOT1dOXCI7XG4gICAgdmFyIHRpbWVzdGFtcCA9IG5ldyBEYXRlKGxvZy50aW1lc3RhbXApLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgIHJlc3VsdC5wdXNoKFwiW1wiICsgbGV2ZWxOYW1lICsgXCJdIEZyYW1lIFwiICsgbG9nLmZyYW1lICsgXCIgKFwiICsgdGltZXN0YW1wICsgXCIpOiBcIiArIGxvZy5tZXNzYWdlKTtcbiAgfSk7XG4gIFxuICByZXN1bHQucHVzaChcIj09PSBFbmQgTG9nIEhpc3RvcnkgPT09XCIpO1xuICByZXR1cm4gcmVzdWx0LmpvaW4oXCJcXG5cIik7XG59XG5cbi8vIEV4cG9ydCBzdGF0cyBmdW5jdGlvbnNcbm1vZHVsZS5leHBvcnRzLmluY3JlbWVudENvbGxpc2lvbkV2ZW50cyA9IGluY3JlbWVudENvbGxpc2lvbkV2ZW50cztcbm1vZHVsZS5leHBvcnRzLmluY3JlbWVudFdhdGVyRm9yY2VzID0gaW5jcmVtZW50V2F0ZXJGb3JjZXM7XG5tb2R1bGUuZXhwb3J0cy5zZXRDYXJzSW5XYXRlciA9IHNldENhcnNJbldhdGVyO1xubW9kdWxlLmV4cG9ydHMuTE9HX0xFVkVMUyA9IExPR19MRVZFTFM7IiwidmFyIHJhbmRvbSA9IHJlcXVpcmUoXCIuL3JhbmRvbS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZ2VuZXJhdG9yKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oaW5zdGFuY2UsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5jcmVhdGVOb3JtYWxzKHNjaGVtYVByb3AsIGdlbmVyYXRvcik7XG4gICAgICBpbnN0YW5jZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sIHsgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpIH0pO1xuICB9LFxuICBjcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGFyZW50Q2hvb3Nlcil7XG4gICAgdmFyIGlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzMik7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoaWQsIGtleSwgcGFyZW50cyk7XG4gICAgICAgIHZhbHVlcy5wdXNoKHBhcmVudHNbcF1ba2V5XVtpXSk7XG4gICAgICB9XG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGNyb3NzRGVmO1xuICAgIH0sIHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnRzLm1hcChmdW5jdGlvbihwYXJlbnQpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkOiBwYXJlbnQuaWQsXG4gICAgICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeSxcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgfSk7XG4gIH0sXG4gIGNyZWF0ZU11dGF0ZWRDbG9uZShzY2hlbWEsIGdlbmVyYXRvciwgcGFyZW50LCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XG4gICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLm11dGF0ZU5vcm1hbHMoXG4gICAgICAgIHNjaGVtYVByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGVcbiAgICAgICk7XG4gICAgICBjbG9uZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH0sIHtcbiAgICAgIGlkOiBwYXJlbnQuaWQsXG4gICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5XG4gICAgfSk7XG4gIH0sXG4gIGFwcGx5VHlwZXMoc2NoZW1hLCBwYXJlbnQpe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XG4gICAgICB2YXIgb3JpZ2luYWxWYWx1ZXMgPSBwYXJlbnRba2V5XTtcbiAgICAgIHZhciB2YWx1ZXM7XG4gICAgICBzd2l0Y2goc2NoZW1hUHJvcC50eXBlKXtcbiAgICAgICAgY2FzZSBcInNodWZmbGVcIiA6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvU2h1ZmZsZShzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiZmxvYXRcIiA6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvRmxvYXQoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcbiAgICAgICAgY2FzZSBcImludGVnZXJcIjpcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9JbnRlZ2VyKHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHtzY2hlbWFQcm9wLnR5cGV9IG9mIHNjaGVtYSBmb3Iga2V5ICR7a2V5fWApO1xuICAgICAgfVxuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9LCB7XG4gICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxuICAgIH0pO1xuICB9LFxufVxuIiwidmFyIGNyZWF0ZSA9IHJlcXVpcmUoXCIuLi9jcmVhdGUtaW5zdGFuY2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZW5lcmF0aW9uWmVybzogZ2VuZXJhdGlvblplcm8sXG4gIG5leHRHZW5lcmF0aW9uOiBuZXh0R2VuZXJhdGlvblxufVxuXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybyhjb25maWcpe1xuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBjb25maWcuZ2VuZXJhdGlvblNpemUsXG4gIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7XG4gIHZhciBjd19jYXJHZW5lcmF0aW9uID0gW107XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xuICAgIHZhciBkZWYgPSBjcmVhdGUuY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIE1hdGgucmFuZG9tKClcbiAgICB9KTtcbiAgICBkZWYuaW5kZXggPSBrO1xuICAgIGN3X2NhckdlbmVyYXRpb24ucHVzaChkZWYpO1xuICB9XG4gIHJldHVybiB7XG4gICAgY291bnRlcjogMCxcbiAgICBnZW5lcmF0aW9uOiBjd19jYXJHZW5lcmF0aW9uLFxuICB9O1xufVxuXG5mdW5jdGlvbiBuZXh0R2VuZXJhdGlvbihcbiAgcHJldmlvdXNTdGF0ZSxcbiAgc2NvcmVzLFxuICBjb25maWdcbil7XG4gIHZhciBsb2dnZXIgPSByZXF1aXJlKFwiLi4vLi4vbG9nZ2VyL2xvZ2dlci5qc1wiKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCI9PT0gTkVYVCBHRU5FUkFUSU9OIFNUQVJUSU5HID09PVwiKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJTY2hlbWE6XCIsIEpTT04uc3RyaW5naWZ5KGNvbmZpZy5zY2hlbWEpKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJHZW5lcmF0aW9uIHNpemU6XCIsIGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSk7XG4gIFxuICB2YXIgY2hhbXBpb25fbGVuZ3RoID0gY29uZmlnLmNoYW1waW9uTGVuZ3RoLFxuICAgIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxuICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzID0gY29uZmlnLnNlbGVjdEZyb21BbGxQYXJlbnRzO1xuXG4gIHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XG4gIHZhciBuZXdib3JuO1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkFkZGluZ1wiLCBjaGFtcGlvbl9sZW5ndGgsIFwiY2hhbXBpb25zIHRvIG5ldyBnZW5lcmF0aW9uXCIpO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGNoYW1waW9uX2xlbmd0aDsgaysrKSB7YGBcbiAgICBzY29yZXNba10uZGVmLmlzX2VsaXRlID0gdHJ1ZTtcbiAgICBzY29yZXNba10uZGVmLmluZGV4ID0gaztcbiAgICBuZXdHZW5lcmF0aW9uLnB1c2goc2NvcmVzW2tdLmRlZik7XG4gIH1cbiAgdmFyIHBhcmVudExpc3QgPSBbXTtcbiAgZm9yIChrID0gY2hhbXBpb25fbGVuZ3RoOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xuICAgIHZhciBwYXJlbnQxID0gc2VsZWN0RnJvbUFsbFBhcmVudHMoc2NvcmVzLCBwYXJlbnRMaXN0KTtcbiAgICB2YXIgcGFyZW50MiA9IHBhcmVudDE7XG4gICAgd2hpbGUgKHBhcmVudDIgPT0gcGFyZW50MSkge1xuICAgICAgcGFyZW50MiA9IHNlbGVjdEZyb21BbGxQYXJlbnRzKHNjb3JlcywgcGFyZW50TGlzdCwgcGFyZW50MSk7XG4gICAgfVxuICAgIHZhciBwYWlyID0gW3BhcmVudDEsIHBhcmVudDJdXG4gICAgcGFyZW50TGlzdC5wdXNoKHBhaXIpO1xuICAgIG5ld2Jvcm4gPSBtYWtlQ2hpbGQoY29uZmlnLFxuICAgICAgcGFpci5tYXAoZnVuY3Rpb24ocGFyZW50KSB7IHJldHVybiBzY29yZXNbcGFyZW50XS5kZWY7IH0pXG4gICAgKTtcbiAgICBuZXdib3JuID0gbXV0YXRlKGNvbmZpZywgbmV3Ym9ybik7XG4gICAgbmV3Ym9ybi5pc19lbGl0ZSA9IGZhbHNlO1xuICAgIG5ld2Jvcm4uaW5kZXggPSBrO1xuICAgIG5ld0dlbmVyYXRpb24ucHVzaChuZXdib3JuKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY291bnRlcjogcHJldmlvdXNTdGF0ZS5jb3VudGVyICsgMSxcbiAgICBnZW5lcmF0aW9uOiBuZXdHZW5lcmF0aW9uLFxuICB9O1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VDaGlsZChjb25maWcsIHBhcmVudHMpe1xuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcbiAgICBwaWNrUGFyZW50ID0gY29uZmlnLnBpY2tQYXJlbnQ7XG4gIHJldHVybiBjcmVhdGUuY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBpY2tQYXJlbnQpXG59XG5cblxuZnVuY3Rpb24gbXV0YXRlKGNvbmZpZywgcGFyZW50KXtcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXG4gICAgbXV0YXRpb25fcmFuZ2UgPSBjb25maWcubXV0YXRpb25fcmFuZ2UsXG4gICAgZ2VuX211dGF0aW9uID0gY29uZmlnLmdlbl9tdXRhdGlvbixcbiAgICBnZW5lcmF0ZVJhbmRvbSA9IGNvbmZpZy5nZW5lcmF0ZVJhbmRvbTtcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVNdXRhdGVkQ2xvbmUoXG4gICAgc2NoZW1hLFxuICAgIGdlbmVyYXRlUmFuZG9tLFxuICAgIHBhcmVudCxcbiAgICBNYXRoLm1heChtdXRhdGlvbl9yYW5nZSksXG4gICAgZ2VuX211dGF0aW9uXG4gIClcbn1cbiIsIlxuXG5jb25zdCByYW5kb20gPSB7XG4gIHNodWZmbGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGggfHwgMTAsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICB9LCBnZW5lcmF0b3IpKTtcbiAgfSxcbiAgY3JlYXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHZhbHVlcy5wdXNoKFxuICAgICAgICBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSxcbiAgbXV0YXRlU2h1ZmZsZShcbiAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcbiAgKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtdXRhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXG4gICAgKSk7XG4gIH0sXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtYXBUb1NodWZmbGUocHJvcCwgbm9ybWFscyl7XG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XG4gICAgdmFyIGxpbWl0ID0gcHJvcC5saW1pdCB8fCBwcm9wLmxlbmd0aDtcbiAgICBcbiAgICAvLyBTaW1wbGUgYXBwcm9hY2g6IGp1c3QgcmV0dXJuIHRoZSBmaXJzdCAnbGltaXQnIGluZGljZXMgd2l0aCBvZmZzZXRcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW1pdCAmJiBpIDwgcHJvcC5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0LnB1c2goaSArIG9mZnNldCk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG4gIG1hcFRvSW50ZWdlcihwcm9wLCBub3JtYWxzKXtcbiAgICBwcm9wID0ge1xuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMTAsXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoXG4gICAgfVxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKS5tYXAoZnVuY3Rpb24oZmxvYXQpe1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xuICAgIH0pO1xuICB9LFxuICBtYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpe1xuICAgIHByb3AgPSB7XG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxXG4gICAgfVxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbihub3JtYWwpe1xuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xuICAgICAgdmFyIHJhbmdlID0gcHJvcC5yYW5nZTtcbiAgICAgIHJldHVybiBtaW4gKyBub3JtYWwgKiByYW5nZVxuICAgIH0pXG4gIH0sXG4gIG11dGF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2VcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uKG9yaWdpbmFsVmFsdWUpe1xuICAgICAgaWYoZ2VuZXJhdG9yKCkgPiBjaGFuY2VUb011dGF0ZSl7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG11dGF0ZU5vcm1hbChcbiAgICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3JcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xuXG5mdW5jdGlvbiBtdXRhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBtdXRhdGlvbl9yYW5nZSl7XG4gIGlmKG11dGF0aW9uX3JhbmdlID4gMSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG11dGF0ZSBiZXlvbmQgYm91bmRzXCIpO1xuICB9XG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xuICBpZiAobmV3TWluIDwgMCkgbmV3TWluID0gMDtcbiAgaWYgKG5ld01pbiArIG11dGF0aW9uX3JhbmdlICA+IDEpXG4gICAgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xuICB2YXIgcmFuZ2VWYWx1ZSA9IGNyZWF0ZU5vcm1hbCh7XG4gICAgaW5jbHVzaXZlOiB0cnVlLFxuICB9LCBnZW5lcmF0b3IpO1xuICByZXR1cm4gbmV3TWluICsgcmFuZ2VWYWx1ZSAqIG11dGF0aW9uX3JhbmdlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKXtcbiAgaWYoIXByb3AuaW5jbHVzaXZlKXtcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdlbmVyYXRvcigpIDwgMC41ID9cbiAgICBnZW5lcmF0b3IoKSA6XG4gICAgMSAtIGdlbmVyYXRvcigpO1xuICB9XG59XG4iLCIvKiBnbG9iYWxzIGJ0b2EgKi9cbnZhciBzZXR1cFNjZW5lID0gcmVxdWlyZShcIi4vc2V0dXAtc2NlbmVcIik7XG52YXIgY2FyUnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xudmFyIGRlZlRvQ2FyID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvZGVmLXRvLWNhclwiKTtcbnZhciB3YXRlclBoeXNpY3MgPSByZXF1aXJlKFwiLi93YXRlci1waHlzaWNzXCIpO1xudmFyIGxvZ2dlciA9IHJlcXVpcmUoXCIuLi9sb2dnZXIvbG9nZ2VyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJ1bkRlZnM7XG5mdW5jdGlvbiBydW5EZWZzKHdvcmxkX2RlZiwgZGVmcywgbGlzdGVuZXJzKSB7XG4gIC8vIEluaXRpYWxpemUgZGVidWcgbG9nZ2VyXG4gIGxvZ2dlci5pbml0KGxvZ2dlci5MT0dfTEVWRUxTLklORk8pO1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIlN0YXJ0aW5nIHdvcmxkIHdpdGhcIiwgZGVmcy5sZW5ndGgsIFwiY2Fyc1wiKTtcbiAgXG4gIGlmICh3b3JsZF9kZWYubXV0YWJsZV9mbG9vcikge1xuICAgIC8vIEdIT1NUIERJU0FCTEVEXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xuICB9XG5cbiAgdmFyIHNjZW5lID0gc2V0dXBTY2VuZSh3b3JsZF9kZWYpO1xuICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDE1LCAxNSk7XG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiYWJvdXQgdG8gYnVpbGQgY2Fyc1wiKTtcbiAgXG4gIC8vIExvZyB3aGVlbCBjb3VudCBmcm9tIGZpcnN0IGNhciBkZWZpbml0aW9uXG4gIGlmIChkZWZzLmxlbmd0aCA+IDAgJiYgZGVmc1swXS53aGVlbF9yYWRpdXMpIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkJ1aWxkaW5nIGdlbmVyYXRpb24gd2l0aFwiLCBkZWZzWzBdLndoZWVsX3JhZGl1cy5sZW5ndGgsIFwid2hlZWxzIHBlciBjYXJcIik7XG4gIH1cbiAgXG4gIHZhciBjYXJzID0gZGVmcy5tYXAoKGRlZiwgaSkgPT4ge1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQnVpbGRpbmcgY2FyXCIsIGksIFwid2l0aFwiLCBkZWYud2hlZWxfcmFkaXVzID8gZGVmLndoZWVsX3JhZGl1cy5sZW5ndGggOiBcInVua25vd25cIiwgXCJ3aGVlbHNcIik7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBjYXJPYmogPSBkZWZUb0NhcihkZWYsIHNjZW5lLndvcmxkLCB3b3JsZF9kZWYpO1xuICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgaSwgXCJidWlsdCBzdWNjZXNzZnVsbHlcIik7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpbmRleDogaSxcbiAgICAgICAgZGVmOiBkZWYsXG4gICAgICAgIGNhcjogY2FyT2JqLFxuICAgICAgICBzdGF0ZTogY2FyUnVuLmdldEluaXRpYWxTdGF0ZSh3b3JsZF9kZWYpXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuRVJST1IsIFwiRXJyb3IgYnVpbGRpbmcgY2FyXCIsIGksIFwiOlwiLCBlLm1lc3NhZ2UpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0pO1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkFsbCBjYXJzIGJ1aWx0IHN1Y2Nlc3NmdWxseVwiKTtcbiAgdmFyIGFsaXZlY2FycyA9IGNhcnM7XG4gIFxuICAvLyBGdW5jdGlvbiB0byBmaW5kIGNhciBpbmZvIGZyb20gYm9keSAoaGFuZGxlcyBkeW5hbWljIHdoZWVsIGNvdW50cylcbiAgZnVuY3Rpb24gZmluZENhckZyb21Cb2R5KGNhckJvZHkpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjYXIgPSBjYXJzW2ldO1xuICAgICAgaWYgKCFjYXIgfHwgIWNhci5jYXIpIGNvbnRpbnVlO1xuICAgICAgXG4gICAgICAvLyBDaGVjayBpZiBpdCdzIHRoZSBjaGFzc2lzXG4gICAgICBpZiAoY2FyLmNhci5jaGFzc2lzID09PSBjYXJCb2R5KSB7XG4gICAgICAgIHJldHVybiB7Y2FySW5kZXg6IGNhci5pbmRleCwgdHlwZTogJ2NoYXNzaXMnfTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gQ2hlY2sgaWYgaXQncyBvbmUgb2YgdGhlIHdoZWVsc1xuICAgICAgZm9yICh2YXIgdyA9IDA7IHcgPCBjYXIuY2FyLndoZWVscy5sZW5ndGg7IHcrKykge1xuICAgICAgICBpZiAoY2FyLmNhci53aGVlbHNbd10gPT09IGNhckJvZHkpIHtcbiAgICAgICAgICByZXR1cm4ge2NhckluZGV4OiBjYXIuaW5kZXgsIHR5cGU6ICd3aGVlbCcsIHdoZWVsSW5kZXg6IHd9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIFxuICAvLyBTZXQgdXAgY29sbGlzaW9uIGxpc3RlbmVyIGZvciB3YXRlclxuICB2YXIgY29sbGlzaW9uQ291bnQgPSAwO1xuICB2YXIgbWF4Q29sbGlzaW9uc1BlckZyYW1lID0gMTAwMDA7IC8vIFNhZmV0eSBsaW1pdCAtIGZ1cnRoZXIgaW5jcmVhc2VkIGZvciAzKyB3aGVlbHNcbiAgXG4gIHZhciBsaXN0ZW5lciA9IHtcbiAgICBCZWdpbkNvbnRhY3Q6IGZ1bmN0aW9uKGNvbnRhY3QpIHtcbiAgICAgIHZhciBmaXh0dXJlQSA9IGNvbnRhY3QuR2V0Rml4dHVyZUEoKTtcbiAgICAgIHZhciBmaXh0dXJlQiA9IGNvbnRhY3QuR2V0Rml4dHVyZUIoKTtcbiAgICAgIFxuICAgICAgLy8gRWFybHkgZXhpdCBpZiBuZWl0aGVyIGZpeHR1cmUgaXMgd2F0ZXJcbiAgICAgIHZhciB1c2VyRGF0YUEgPSBmaXh0dXJlQS5HZXRVc2VyRGF0YSgpO1xuICAgICAgdmFyIHVzZXJEYXRhQiA9IGZpeHR1cmVCLkdldFVzZXJEYXRhKCk7XG4gICAgICBcbiAgICAgIGlmICgoIXVzZXJEYXRhQSB8fCB1c2VyRGF0YUEudHlwZSAhPT0gXCJ3YXRlclwiKSAmJiBcbiAgICAgICAgICAoIXVzZXJEYXRhQiB8fCB1c2VyRGF0YUIudHlwZSAhPT0gXCJ3YXRlclwiKSkge1xuICAgICAgICByZXR1cm47IC8vIE5vdCBhIHdhdGVyIGNvbGxpc2lvbiwgaWdub3JlIGl0XG4gICAgICB9XG4gICAgICBcbiAgICAgIGxvZ2dlci5pbmNyZW1lbnRDb2xsaXNpb25FdmVudHMoKTtcbiAgICAgIGNvbGxpc2lvbkNvdW50Kys7XG4gICAgICBcbiAgICAgIC8vIFNhZmV0eSBjaXJjdWl0IGJyZWFrZXJcbiAgICAgIGlmIChjb2xsaXNpb25Db3VudCA+IG1heENvbGxpc2lvbnNQZXJGcmFtZSkge1xuICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkVSUk9SLCBcIlRvbyBtYW55IGNvbGxpc2lvbnMgcGVyIGZyYW1lISBJZ25vcmluZyBjb2xsaXNpb25cIiwgY29sbGlzaW9uQ291bnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciB3YXRlckZpeHR1cmUgPSBudWxsO1xuICAgICAgdmFyIGNhckZpeHR1cmUgPSBudWxsO1xuICAgICAgXG4gICAgICBpZiAoZml4dHVyZUEuR2V0VXNlckRhdGEoKSAmJiBmaXh0dXJlQS5HZXRVc2VyRGF0YSgpLnR5cGUgPT09IFwid2F0ZXJcIikge1xuICAgICAgICB3YXRlckZpeHR1cmUgPSBmaXh0dXJlQTtcbiAgICAgICAgY2FyRml4dHVyZSA9IGZpeHR1cmVCO1xuICAgICAgfSBlbHNlIGlmIChmaXh0dXJlQi5HZXRVc2VyRGF0YSgpICYmIGZpeHR1cmVCLkdldFVzZXJEYXRhKCkudHlwZSA9PT0gXCJ3YXRlclwiKSB7XG4gICAgICAgIHdhdGVyRml4dHVyZSA9IGZpeHR1cmVCO1xuICAgICAgICBjYXJGaXh0dXJlID0gZml4dHVyZUE7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmICh3YXRlckZpeHR1cmUgJiYgY2FyRml4dHVyZSkge1xuICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIldhdGVyIGNvbGxpc2lvbiBkZXRlY3RlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBkeW5hbWljIGxvb2t1cCB0byBoYW5kbGUgY2hhbmdpbmcgd2hlZWwgY291bnRzXG4gICAgICAgIHZhciBjYXJCb2R5ID0gY2FyRml4dHVyZS5HZXRCb2R5KCk7XG4gICAgICAgIHZhciBjYXJJbmZvID0gZmluZENhckZyb21Cb2R5KGNhckJvZHkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhckluZm8pIHtcbiAgICAgICAgICBpZiAoY2FySW5mby50eXBlID09PSAnY2hhc3NpcycpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQ2FyXCIsIGNhckluZm8uY2FySW5kZXgsIFwiY2hhc3NpcyBlbnRlcmVkIHdhdGVyXCIpO1xuICAgICAgICAgICAgd2F0ZXJQaHlzaWNzLnJlZ2lzdGVyQ2FyUGFydEluV2F0ZXIoY2FySW5mby5jYXJJbmRleCwgXCJjaGFzc2lzXCIsIHdhdGVyRml4dHVyZS5HZXRVc2VyRGF0YSgpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNhckluZm8udHlwZSA9PT0gJ3doZWVsJykge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySW5mby5jYXJJbmRleCwgXCJ3aGVlbFwiLCBjYXJJbmZvLndoZWVsSW5kZXgsIFwiZW50ZXJlZCB3YXRlclwiKTtcbiAgICAgICAgICAgIHdhdGVyUGh5c2ljcy5yZWdpc3RlckNhclBhcnRJbldhdGVyKGNhckluZm8uY2FySW5kZXgsIFwid2hlZWxcIiArIGNhckluZm8ud2hlZWxJbmRleCwgd2F0ZXJGaXh0dXJlLkdldFVzZXJEYXRhKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIldhdGVyIGNvbGxpc2lvbiBidXQgY291bGRuJ3QgZmluZCBjYXIgZm9yIGJvZHlcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIEVuZENvbnRhY3Q6IGZ1bmN0aW9uKGNvbnRhY3QpIHtcbiAgICAgIHZhciBmaXh0dXJlQSA9IGNvbnRhY3QuR2V0Rml4dHVyZUEoKTtcbiAgICAgIHZhciBmaXh0dXJlQiA9IGNvbnRhY3QuR2V0Rml4dHVyZUIoKTtcbiAgICAgIFxuICAgICAgLy8gRWFybHkgZXhpdCBpZiBuZWl0aGVyIGZpeHR1cmUgaXMgd2F0ZXJcbiAgICAgIHZhciB1c2VyRGF0YUEgPSBmaXh0dXJlQS5HZXRVc2VyRGF0YSgpO1xuICAgICAgdmFyIHVzZXJEYXRhQiA9IGZpeHR1cmVCLkdldFVzZXJEYXRhKCk7XG4gICAgICBcbiAgICAgIGlmICgoIXVzZXJEYXRhQSB8fCB1c2VyRGF0YUEudHlwZSAhPT0gXCJ3YXRlclwiKSAmJiBcbiAgICAgICAgICAoIXVzZXJEYXRhQiB8fCB1c2VyRGF0YUIudHlwZSAhPT0gXCJ3YXRlclwiKSkge1xuICAgICAgICByZXR1cm47IC8vIE5vdCBhIHdhdGVyIGNvbGxpc2lvbiwgaWdub3JlIGl0XG4gICAgICB9XG4gICAgICBcbiAgICAgIGxvZ2dlci5pbmNyZW1lbnRDb2xsaXNpb25FdmVudHMoKTtcbiAgICAgIFxuICAgICAgdmFyIHdhdGVyRml4dHVyZSA9IG51bGw7XG4gICAgICB2YXIgY2FyRml4dHVyZSA9IG51bGw7XG4gICAgICBcbiAgICAgIGlmIChmaXh0dXJlQS5HZXRVc2VyRGF0YSgpICYmIGZpeHR1cmVBLkdldFVzZXJEYXRhKCkudHlwZSA9PT0gXCJ3YXRlclwiKSB7XG4gICAgICAgIHdhdGVyRml4dHVyZSA9IGZpeHR1cmVBO1xuICAgICAgICBjYXJGaXh0dXJlID0gZml4dHVyZUI7XG4gICAgICB9IGVsc2UgaWYgKGZpeHR1cmVCLkdldFVzZXJEYXRhKCkgJiYgZml4dHVyZUIuR2V0VXNlckRhdGEoKS50eXBlID09PSBcIndhdGVyXCIpIHtcbiAgICAgICAgd2F0ZXJGaXh0dXJlID0gZml4dHVyZUI7XG4gICAgICAgIGNhckZpeHR1cmUgPSBmaXh0dXJlQTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHdhdGVyRml4dHVyZSAmJiBjYXJGaXh0dXJlKSB7XG4gICAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiV2F0ZXIgZXhpdCBkZXRlY3RlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBkeW5hbWljIGxvb2t1cCB0byBoYW5kbGUgY2hhbmdpbmcgd2hlZWwgY291bnRzXG4gICAgICAgIHZhciBjYXJCb2R5ID0gY2FyRml4dHVyZS5HZXRCb2R5KCk7XG4gICAgICAgIHZhciBjYXJJbmZvID0gZmluZENhckZyb21Cb2R5KGNhckJvZHkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhckluZm8pIHtcbiAgICAgICAgICBpZiAoY2FySW5mby50eXBlID09PSAnY2hhc3NpcycpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQ2FyXCIsIGNhckluZm8uY2FySW5kZXgsIFwiY2hhc3NpcyBleGl0ZWQgd2F0ZXJcIik7XG4gICAgICAgICAgICB3YXRlclBoeXNpY3MudW5yZWdpc3RlckNhclBhcnRGcm9tV2F0ZXIoY2FySW5mby5jYXJJbmRleCwgXCJjaGFzc2lzXCIpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2FySW5mby50eXBlID09PSAnd2hlZWwnKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXJJbmZvLmNhckluZGV4LCBcIndoZWVsXCIsIGNhckluZm8ud2hlZWxJbmRleCwgXCJleGl0ZWQgd2F0ZXJcIik7XG4gICAgICAgICAgICB3YXRlclBoeXNpY3MudW5yZWdpc3RlckNhclBhcnRGcm9tV2F0ZXIoY2FySW5mby5jYXJJbmRleCwgXCJ3aGVlbFwiICsgY2FySW5mby53aGVlbEluZGV4KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJXYXRlciBleGl0IGJ1dCBjb3VsZG4ndCBmaW5kIGNhciBmb3IgYm9keVwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgUHJlU29sdmU6IGZ1bmN0aW9uKCkge30sXG4gICAgUG9zdFNvbHZlOiBmdW5jdGlvbigpIHt9XG4gIH07XG4gIFxuICBzY2VuZS53b3JsZC5TZXRDb250YWN0TGlzdGVuZXIobGlzdGVuZXIpO1xuICBcbiAgcmV0dXJuIHtcbiAgICBzY2VuZTogc2NlbmUsXG4gICAgY2FyczogY2FycyxcbiAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsb2dnZXIuZnJhbWVTdGFydCgpO1xuICAgICAgbG9nZ2VyLnRpbWUoXCJ0b3RhbC1zdGVwXCIpO1xuICAgICAgY29sbGlzaW9uQ291bnQgPSAwOyAvLyBSZXNldCBjb2xsaXNpb24gY291bnRlciBlYWNoIGZyYW1lXG4gICAgICBcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vIG1vcmUgY2Fyc1wiKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gQXBwbHkgd2F0ZXIgcGh5c2ljcyBCRUZPUkUgcGh5c2ljcyBzdGVwIHRvIGF2b2lkIHRpbWluZyBpc3N1ZXNcbiAgICAgIGxvZ2dlci50aW1lKFwid2F0ZXItcGh5c2ljc1wiKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIENsZWFyIGZyYW1lLWxldmVsIGV4aXQgdHJhY2tpbmcgYXQgdGhlIHN0YXJ0IG9mIGVhY2ggcGh5c2ljcyBzdGVwXG4gICAgICAgIHdhdGVyUGh5c2ljcy5jbGVhckZyYW1lRXhpdFRyYWNraW5nKCk7XG4gICAgICAgIFxuICAgICAgICB2YXIgY2Fyc0luV2F0ZXIgPSB3YXRlclBoeXNpY3MuZ2V0Q2Fyc0luV2F0ZXIoKTtcbiAgICAgICAgbG9nZ2VyLnNldENhcnNJbldhdGVyKGNhcnNJbldhdGVyLnNpemUpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhcnNJbldhdGVyLnNpemUgPiAwKSB7XG4gICAgICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJBcHBseWluZyB3YXRlciBmb3JjZXMgdG9cIiwgY2Fyc0luV2F0ZXIuc2l6ZSwgXCJjYXJzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjYXJzSW5XYXRlci5mb3JFYWNoKGZ1bmN0aW9uKHdhdGVyRGF0YSwgY2FySW5kZXgpIHtcbiAgICAgICAgICB2YXIgY2FyID0gY2Fyc1tjYXJJbmRleF07XG4gICAgICAgICAgaWYgKGNhciAmJiBjYXIuY2FyICYmIGNhckluZGV4IDwgY2Fycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHdhdGVyUGh5c2ljcy5hcHBseVdhdGVyRm9yY2VzKGNhci5jYXIsIHdhdGVyRGF0YSk7XG4gICAgICAgICAgICBsb2dnZXIuaW5jcmVtZW50V2F0ZXJGb3JjZXMoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgaW52YWxpZCBlbnRyaWVzXG4gICAgICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIlJlbW92aW5nIGludmFsaWQgY2FyXCIsIGNhckluZGV4LCBcImZyb20gd2F0ZXIgcmVnaXN0cnlcIik7XG4gICAgICAgICAgICB3YXRlclBoeXNpY3MudW5yZWdpc3RlckNhckZyb21XYXRlcihjYXJJbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5FUlJPUiwgXCJFcnJvciBpbiB3YXRlciBwaHlzaWNzOlwiLCBlKTtcbiAgICAgIH1cbiAgICAgIGxvZ2dlci50aW1lRW5kKFwid2F0ZXItcGh5c2ljc1wiKTtcbiAgICAgIFxuICAgICAgbG9nZ2VyLnRpbWUoXCJwaHlzaWNzLXN0ZXBcIik7XG4gICAgICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDE1LCAxNSk7XG4gICAgICBsb2dnZXIudGltZUVuZChcInBoeXNpY3Mtc3RlcFwiKTtcbiAgICAgIFxuICAgICAgbGlzdGVuZXJzLnByZUNhclN0ZXAoKTtcbiAgICAgIGFsaXZlY2FycyA9IGFsaXZlY2Fycy5maWx0ZXIoZnVuY3Rpb24gKGNhcikge1xuICAgICAgICAvLyBQYXNzIGNhciBpbmRleCB0byB0aGUgY2FyIGZvciB3YXRlciBkZXRlY3Rpb25cbiAgICAgICAgY2FyLmNhci5jYXJJbmRleCA9IGNhci5pbmRleDtcbiAgICAgICAgXG4gICAgICAgIC8vIEdMT0JBTCBGTFlJTkcgQ0FSIFBSRVZFTlRJT046IENoZWNrIGFsbCBjYXJzIGZvciBleGNlc3NpdmUgdXB3YXJkIHZlbG9jaXR5XG4gICAgICAgIGlmIChjYXIuY2FyLmNoYXNzaXMgJiYgY2FyLmNhci5jaGFzc2lzLklzQWN0aXZlKCkpIHtcbiAgICAgICAgICB2YXIgdmVsb2NpdHkgPSBjYXIuY2FyLmNoYXNzaXMuR2V0TGluZWFyVmVsb2NpdHkoKTtcbiAgICAgICAgICBpZiAodmVsb2NpdHkgJiYgdmVsb2NpdHkueSA+IDEuMikge1xuICAgICAgICAgICAgLy8gbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5XQVJOLCBcIkdMT0JBTDogQ2FyXCIsIGNhci5pbmRleCwgXCJmbHlpbmcgd2l0aCB2ZWxvY2l0eVwiLCB2ZWxvY2l0eS55LnRvRml4ZWQoMiksIFwiLSBhZ2dyZXNzaXZlIHJlc2V0XCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBR0dSRVNTSVZFIFJFU0VUOiBTZXQgZG93bndhcmQgdmVsb2NpdHkgdG8gYnJlYWsgZm9yY2UgZXF1aWxpYnJpdW1cbiAgICAgICAgICAgIGNhci5jYXIuY2hhc3Npcy5TZXRMaW5lYXJWZWxvY2l0eShuZXcgYjJWZWMyKHZlbG9jaXR5LngsIC0wLjUpKTtcbiAgICAgICAgICAgIGNhci5jYXIuY2hhc3Npcy5TZXRBbmd1bGFyVmVsb2NpdHkoMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFsc28gcmVzZXQgd2hlZWxzIHRvIHByZXZlbnQgam9pbnQgZm9yY2VzXG4gICAgICAgICAgICBpZiAoY2FyLmNhci53aGVlbHMpIHtcbiAgICAgICAgICAgICAgZm9yICh2YXIgdyA9IDA7IHcgPCBjYXIuY2FyLndoZWVscy5sZW5ndGg7IHcrKykge1xuICAgICAgICAgICAgICAgIGlmIChjYXIuY2FyLndoZWVsc1t3XSAmJiBjYXIuY2FyLndoZWVsc1t3XS5Jc0FjdGl2ZSgpKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgd2hlZWxWZWwgPSBjYXIuY2FyLndoZWVsc1t3XS5HZXRMaW5lYXJWZWxvY2l0eSgpO1xuICAgICAgICAgICAgICAgICAgY2FyLmNhci53aGVlbHNbd10uU2V0TGluZWFyVmVsb2NpdHkobmV3IGIyVmVjMih3aGVlbFZlbC54LCAtMC41KSk7XG4gICAgICAgICAgICAgICAgICBjYXIuY2FyLndoZWVsc1t3XS5TZXRBbmd1bGFyVmVsb2NpdHkoMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvcmNlIHJlbW92ZSBmcm9tIGFueSB3YXRlciB0cmFja2luZ1xuICAgICAgICAgICAgd2F0ZXJQaHlzaWNzLnVucmVnaXN0ZXJDYXJGcm9tV2F0ZXIoY2FyLmluZGV4KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNhci5zdGF0ZSA9IGNhclJ1bi51cGRhdGVTdGF0ZShcbiAgICAgICAgICB3b3JsZF9kZWYsIGNhci5jYXIsIGNhci5zdGF0ZVxuICAgICAgICApO1xuICAgICAgICB2YXIgc3RhdHVzID0gY2FyUnVuLmdldFN0YXR1cyhjYXIuc3RhdGUsIHdvcmxkX2RlZik7XG4gICAgICAgIGxpc3RlbmVycy5jYXJTdGVwKGNhcik7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjYXIuc2NvcmUgPSBjYXJSdW4uY2FsY3VsYXRlU2NvcmUoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xuICAgICAgICBsaXN0ZW5lcnMuY2FyRGVhdGgoY2FyKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBjYXIgZnJvbSB3YXRlciB0cmFja2luZyB3aGVuIGl0IGRpZXNcbiAgICAgICAgd2F0ZXJQaHlzaWNzLnVucmVnaXN0ZXJDYXJGcm9tV2F0ZXIoY2FyLmluZGV4KTtcblxuICAgICAgICB2YXIgd29ybGQgPSBzY2VuZS53b3JsZDtcbiAgICAgICAgdmFyIHdvcmxkQ2FyID0gY2FyLmNhcjtcbiAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIuY2hhc3Npcyk7XG5cbiAgICAgICAgZm9yICh2YXIgdyA9IDA7IHcgPCB3b3JsZENhci53aGVlbHMubGVuZ3RoOyB3KyspIHtcbiAgICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci53aGVlbHNbd10pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSlcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxpc3RlbmVycy5nZW5lcmF0aW9uRW5kKGNhcnMpO1xuICAgICAgfVxuICAgICAgXG4gICAgICBsb2dnZXIudGltZUVuZChcInRvdGFsLXN0ZXBcIik7XG4gICAgICBsb2dnZXIuZnJhbWVFbmQoKTtcbiAgICB9XG4gIH1cblxufVxuIiwiLyogZ2xvYmFscyBiMldvcmxkIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXG5cbnZhciB3YXRlclBoeXNpY3MgPSByZXF1aXJlKFwiLi93YXRlci1waHlzaWNzXCIpO1xudmFyIGxvZ2dlciA9IHJlcXVpcmUoXCIuLi9sb2dnZXIvbG9nZ2VyXCIpO1xuXG4vKlxuXG53b3JsZF9kZWYgPSB7XG4gIGdyYXZpdHk6IHt4LCB5fSxcbiAgZG9TbGVlcDogYm9vbGVhbixcbiAgZmxvb3JzZWVkOiBzdHJpbmcsXG4gIHRpbGVEaW1lbnNpb25zLFxuICBtYXhGbG9vclRpbGVzLFxuICBtdXRhYmxlX2Zsb29yOiBib29sZWFuLFxuICB3YXRlckVuYWJsZWQ6IGJvb2xlYW5cbn1cblxuKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3b3JsZF9kZWYpe1xuXG4gIHZhciB3b3JsZCA9IG5ldyBiMldvcmxkKHdvcmxkX2RlZi5ncmF2aXR5LCB3b3JsZF9kZWYuZG9TbGVlcCk7XG4gIFxuICAvLyBDbGVhciBhbnkgZXhpc3Rpbmcgd2F0ZXIgem9uZXNcbiAgd2F0ZXJQaHlzaWNzLmNsZWFyV2F0ZXJab25lcygpO1xuICBcbiAgdmFyIGZsb29yRGF0YSA9IGN3X2NyZWF0ZUZsb29yKFxuICAgIHdvcmxkLFxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQsXG4gICAgd29ybGRfZGVmLnRpbGVEaW1lbnNpb25zLFxuICAgIHdvcmxkX2RlZi5tYXhGbG9vclRpbGVzLFxuICAgIHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yLFxuICAgIHdvcmxkX2RlZi53YXRlckVuYWJsZWRcbiAgKTtcblxuICB2YXIgbGFzdF90aWxlID0gZmxvb3JEYXRhLmZsb29yVGlsZXNbXG4gICAgZmxvb3JEYXRhLmZsb29yVGlsZXMubGVuZ3RoIC0gMVxuICBdO1xuICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQoXG4gICAgbGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXVxuICApO1xuICB3b3JsZC5maW5pc2hMaW5lID0gdGlsZV9wb3NpdGlvbi54O1xuICBcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIldvcmxkIHNldHVwIGNvbXBsZXRlIC0gRmluaXNoIGxpbmUgYXQgWDpcIiwgdGlsZV9wb3NpdGlvbi54LnRvRml4ZWQoMiksIFxuICAgIFwiRmxvb3IgdGlsZXM6XCIsIGZsb29yRGF0YS5mbG9vclRpbGVzLmxlbmd0aCwgXCJXYXRlciB6b25lczpcIiwgZmxvb3JEYXRhLndhdGVyWm9uZXMubGVuZ3RoKTtcbiAgXG4gIHJldHVybiB7XG4gICAgd29ybGQ6IHdvcmxkLFxuICAgIGZsb29yVGlsZXM6IGZsb29yRGF0YS5mbG9vclRpbGVzLFxuICAgIHdhdGVyWm9uZXM6IGZsb29yRGF0YS53YXRlclpvbmVzLFxuICAgIGZpbmlzaExpbmU6IHRpbGVfcG9zaXRpb24ueFxuICB9O1xufVxuXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vcih3b3JsZCwgZmxvb3JzZWVkLCBkaW1lbnNpb25zLCBtYXhGbG9vclRpbGVzLCBtdXRhYmxlX2Zsb29yLCB3YXRlckVuYWJsZWQpIHtcbiAgdmFyIGxhc3RfdGlsZSA9IG51bGw7XG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbmV3IGIyVmVjMigtNSwgMCk7XG4gIHZhciBjd19mbG9vclRpbGVzID0gW107XG4gIHZhciB3YXRlclpvbmVzID0gW107XG4gIHZhciB3YXRlclByb2JhYmlsaXR5ID0gMC4xNTsgLy8gUmVkdWNlZCB3YXRlciBwcm9iYWJpbGl0eSB0byBjb250cm9sIHRyYWNrIGxlbmd0aFxuICB2YXIgbWluRGlzdGFuY2VCZXR3ZWVuV2F0ZXIgPSAxMDsgLy8gSW5jcmVhc2VkIG1pbmltdW0gZGlzdGFuY2UgdG8gc3ByZWFkIHdhdGVyIG91dFxuICB2YXIgbGFzdFdhdGVySW5kZXggPSAtbWluRGlzdGFuY2VCZXR3ZWVuV2F0ZXI7XG4gIFxuICAvLyBUYXJnZXQgdGhlIHNhbWUgdHJhY2sgbGVuZ3RoIHdoZXRoZXIgd2F0ZXIgaXMgZW5hYmxlZCBvciBub3RcbiAgdmFyIHRhcmdldFRyYWNrTGVuZ3RoID0gbWF4Rmxvb3JUaWxlcyAqIGRpbWVuc2lvbnMueDsgLy8gRXhwZWN0ZWQgdHJhY2sgbGVuZ3RoIHdpdGhvdXQgd2F0ZXJcbiAgdmFyIHdhdGVyV2lkdGhCdWRnZXQgPSAwOyAvLyBUcmFjayBob3cgbXVjaCBleHRyYSBsZW5ndGggd2F0ZXIgYWRkc1xuICBcbiAgTWF0aC5zZWVkcmFuZG9tKGZsb29yc2VlZCk7XG4gIFxuICAvLyBJTVBPUlRBTlQ6IFdlIG11c3QgY3JlYXRlIGV4YWN0bHkgbWF4Rmxvb3JUaWxlcyB0aWxlcyBBTkQgbWFpbnRhaW4gY29uc2lzdGVudCB0cmFjayBsZW5ndGhcbiAgdmFyIHRpbGVzQ3JlYXRlZCA9IDA7XG4gIHZhciBzZWdtZW50SW5kZXggPSAwOyAvLyBUcmFjayBwb3NpdGlvbiBmb3Igd2F0ZXIgcGxhY2VtZW50IGRlY2lzaW9uc1xuICBcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIlN0YXJ0aW5nIGZsb29yIGdlbmVyYXRpb24gLSBtYXhGbG9vclRpbGVzOlwiLCBtYXhGbG9vclRpbGVzLCBcIndhdGVyRW5hYmxlZDpcIiwgd2F0ZXJFbmFibGVkLCBcInRhcmdldCBsZW5ndGg6XCIsIHRhcmdldFRyYWNrTGVuZ3RoLnRvRml4ZWQoMikpO1xuICBcbiAgd2hpbGUgKHRpbGVzQ3JlYXRlZCA8IG1heEZsb29yVGlsZXMpIHtcbiAgICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgY3JlYXRlIHdhdGVyIGhlcmUgLSB3aXRoIGJ1ZGdldCBjb250cm9sXG4gICAgdmFyIGNyZWF0ZVdhdGVyID0gZmFsc2U7XG4gICAgaWYgKHdhdGVyRW5hYmxlZCAmJiBzZWdtZW50SW5kZXggPiAxNSAmJiB0aWxlc0NyZWF0ZWQgPCBtYXhGbG9vclRpbGVzIC0gMzApIHsgLy8gRG9uJ3QgcHV0IHdhdGVyIHRvbyBlYXJseSBvciBsYXRlXG4gICAgICBpZiAoc2VnbWVudEluZGV4IC0gbGFzdFdhdGVySW5kZXggPj0gbWluRGlzdGFuY2VCZXR3ZWVuV2F0ZXIpIHtcbiAgICAgICAgLy8gT25seSBjcmVhdGUgd2F0ZXIgaWYgd2UgaGF2ZW4ndCBleGNlZWRlZCBvdXIgdHJhY2sgbGVuZ3RoIGJ1ZGdldFxuICAgICAgICB2YXIgcHJvamVjdGVkRXh0cmFMZW5ndGggPSB3YXRlcldpZHRoQnVkZ2V0ICsgKDIuNSAqIGRpbWVuc2lvbnMueCk7IC8vIEVzdGltYXRlIHdhdGVyIHdpZHRoXG4gICAgICAgIHZhciByZW1haW5pbmdUaWxlcyA9IG1heEZsb29yVGlsZXMgLSB0aWxlc0NyZWF0ZWQ7XG4gICAgICAgIHZhciBwcm9qZWN0ZWRUb3RhbExlbmd0aCA9IHRpbGVfcG9zaXRpb24ueCArIChyZW1haW5pbmdUaWxlcyAqIGRpbWVuc2lvbnMueCkgKyBwcm9qZWN0ZWRFeHRyYUxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIGlmIChwcm9qZWN0ZWRUb3RhbExlbmd0aCA8IHRhcmdldFRyYWNrTGVuZ3RoICogMS4xNSkgeyAvLyBBbGxvdyAxNSUgbG9uZ2VyIG1heFxuICAgICAgICAgIGNyZWF0ZVdhdGVyID0gTWF0aC5yYW5kb20oKSA8IHdhdGVyUHJvYmFiaWxpdHk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKGNyZWF0ZVdhdGVyKSB7XG4gICAgICAvLyBDcmVhdGUgc21hbGxlciB3YXRlciB6b25lcyB0byBjb250cm9sIHRyYWNrIGxlbmd0aFxuICAgICAgdmFyIHdhdGVyV2lkdGggPSAxLjUgKyBNYXRoLnJhbmRvbSgpICogMS41OyAvLyAxLjUtMyB0aWxlcyB3aWRlIChyZWR1Y2VkKVxuICAgICAgdmFyIHdhdGVyRGVwdGggPSAyLjAgKyBNYXRoLnJhbmRvbSgpICogMS4wOyAvLyAyLTMgdW5pdHMgZGVlcFxuICAgICAgdmFyIHdhdGVyUGh5c2ljYWxXaWR0aCA9IHdhdGVyV2lkdGggKiBkaW1lbnNpb25zLng7XG4gICAgICBcbiAgICAgIC8vIENyZWF0ZSB3YXRlciB6b25lIGF0IGN1cnJlbnQgcG9zaXRpb25cbiAgICAgIHZhciB3YXRlclpvbmUgPSB3YXRlclBoeXNpY3MuY3JlYXRlV2F0ZXJab25lKFxuICAgICAgICB3b3JsZCxcbiAgICAgICAgbmV3IGIyVmVjMih0aWxlX3Bvc2l0aW9uLngsIHRpbGVfcG9zaXRpb24ueSAtIDAuNSksIC8vIEJlbG93IGdyb3VuZCBsZXZlbFxuICAgICAgICB3YXRlclBoeXNpY2FsV2lkdGgsXG4gICAgICAgIHdhdGVyRGVwdGhcbiAgICAgICk7XG4gICAgICB3YXRlclpvbmVzLnB1c2god2F0ZXJab25lKTtcbiAgICAgIFxuICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIkNyZWF0ZWQgd2F0ZXIgem9uZSBhdCBzZWdtZW50XCIsIHNlZ21lbnRJbmRleCwgXCJ3aWR0aDpcIiwgd2F0ZXJXaWR0aC50b0ZpeGVkKDIpLCBcInRpbGVzXCIpO1xuICAgICAgXG4gICAgICAvLyBNb3ZlIHBvc2l0aW9uIHBhc3QgdGhlIHdhdGVyIGFuZCB0cmFjayB0aGUgZXh0cmEgbGVuZ3RoXG4gICAgICB0aWxlX3Bvc2l0aW9uLnggKz0gd2F0ZXJQaHlzaWNhbFdpZHRoO1xuICAgICAgd2F0ZXJXaWR0aEJ1ZGdldCArPSB3YXRlclBoeXNpY2FsV2lkdGg7XG4gICAgICBsYXN0V2F0ZXJJbmRleCA9IHNlZ21lbnRJbmRleDtcbiAgICAgIFxuICAgICAgLy8gSW5jcmVtZW50IHNlZ21lbnQgaW5kZXggYnV0IE5PVCB0aWxlIGNvdW50ICh3YXRlciBkb2Vzbid0IGNyZWF0ZSB0aWxlcylcbiAgICAgIHNlZ21lbnRJbmRleCArPSBNYXRoLmZsb29yKHdhdGVyV2lkdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDcmVhdGUgbm9ybWFsIGZsb29yIHRpbGVcbiAgICAgIC8vIFVzZSB0aWxlc0NyZWF0ZWQgZm9yIGNvbnNpc3RlbnQgZGlmZmljdWx0eSBwcm9ncmVzc2lvblxuICAgICAgaWYgKCFtdXRhYmxlX2Zsb29yKSB7XG4gICAgICAgIC8vIGtlZXAgb2xkIGltcG9zc2libGUgdHJhY2tzIGlmIG5vdCB1c2luZyBtdXRhYmxlIGZsb29yc1xuICAgICAgICBsYXN0X3RpbGUgPSBjd19jcmVhdGVGbG9vclRpbGUoXG4gICAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjUgKiB0aWxlc0NyZWF0ZWQgLyBtYXhGbG9vclRpbGVzXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiBwYXRoIGlzIG11dGFibGUgb3ZlciByYWNlcywgY3JlYXRlIHNtb290aGVyIHRyYWNrc1xuICAgICAgICBsYXN0X3RpbGUgPSBjd19jcmVhdGVGbG9vclRpbGUoXG4gICAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjIgKiB0aWxlc0NyZWF0ZWQgLyBtYXhGbG9vclRpbGVzXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBjd19mbG9vclRpbGVzLnB1c2gobGFzdF90aWxlKTtcbiAgICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcbiAgICAgIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcbiAgICAgIHRpbGVzQ3JlYXRlZCsrO1xuICAgICAgc2VnbWVudEluZGV4Kys7XG4gICAgfVxuICB9XG4gIFxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLklORk8sIFwiRmxvb3IgZ2VuZXJhdGlvbiBjb21wbGV0ZSAtIFNlZ21lbnRzOlwiLCBzZWdtZW50SW5kZXgsIFwiVGlsZXMgY3JlYXRlZDpcIiwgdGlsZXNDcmVhdGVkLCBcIldhdGVyIHpvbmVzOlwiLCB3YXRlclpvbmVzLmxlbmd0aCk7XG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuSU5GTywgXCJGaW5hbCBwb3NpdGlvbiBYOlwiLCB0aWxlX3Bvc2l0aW9uLngudG9GaXhlZCgyKSwgXCJUYXJnZXQgd2FzOlwiLCB0YXJnZXRUcmFja0xlbmd0aC50b0ZpeGVkKDIpLCBcIkRpZmZlcmVuY2U6XCIsICh0aWxlX3Bvc2l0aW9uLnggLSB0YXJnZXRUcmFja0xlbmd0aCkudG9GaXhlZCgyKSk7XG4gIFxuICByZXR1cm4ge1xuICAgIGZsb29yVGlsZXM6IGN3X2Zsb29yVGlsZXMsXG4gICAgd2F0ZXJab25lczogd2F0ZXJab25lc1xuICB9O1xufVxuXG5cbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yVGlsZSh3b3JsZCwgZGltLCBwb3NpdGlvbiwgYW5nbGUpIHtcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldChwb3NpdGlvbi54LCBwb3NpdGlvbi55KTtcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDAuNTtcblxuICB2YXIgY29vcmRzID0gbmV3IEFycmF5KCk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgMCkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIC1kaW0ueSkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAtZGltLnkpKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgMCkpO1xuXG4gIHZhciBjZW50ZXIgPSBuZXcgYjJWZWMyKDAsIDApO1xuXG4gIHZhciBuZXdjb29yZHMgPSBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKTtcblxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkobmV3Y29vcmRzKTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuXG5mdW5jdGlvbiBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKSB7XG4gIHJldHVybiBjb29yZHMubWFwKGZ1bmN0aW9uKGNvb3JkKXtcbiAgICByZXR1cm4ge1xuICAgICAgeDogTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgLSBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci54LFxuICAgICAgeTogTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgKyBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci55LFxuICAgIH07XG4gIH0pO1xufVxuIiwiLyogZ2xvYmFscyBiMlZlYzIgYjJCb2R5RGVmIGIyRml4dHVyZURlZiBiMlBvbHlnb25TaGFwZSAqL1xuXG52YXIgbG9nZ2VyID0gcmVxdWlyZShcIi4uL2xvZ2dlci9sb2dnZXJcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjcmVhdGVXYXRlclpvbmU6IGNyZWF0ZVdhdGVyWm9uZSxcbiAgYXBwbHlXYXRlckZvcmNlczogYXBwbHlXYXRlckZvcmNlcyxcbiAgaXNJbldhdGVyOiBpc0luV2F0ZXIsXG4gIGNsZWFyRnJhbWVFeGl0VHJhY2tpbmc6IGNsZWFyRnJhbWVFeGl0VHJhY2tpbmdcbn07XG5cbnZhciB3YXRlclpvbmVzID0gW107XG52YXIgY2Fyc0luV2F0ZXIgPSBuZXcgTWFwKCk7XG52YXIgY2FyUGFydHNJbldhdGVyID0gbmV3IE1hcCgpOyAvLyBUcmFjayB3aGljaCBwYXJ0cyBvZiBlYWNoIGNhciBhcmUgaW4gd2F0ZXJcbnZhciBjYXJSZWZlcmVuY2VzID0gbmV3IE1hcCgpOyAvLyBTdG9yZSBjYXIgb2JqZWN0IHJlZmVyZW5jZXMgZm9yIGZvcmNlIGNsZWFyaW5nXG52YXIgY2FyRXhpdEZvcmNlcyA9IG5ldyBNYXAoKTsgLy8gVHJhY2sgYWNjdW11bGF0ZWQgZm9yY2VzIHRvIGNvdW50ZXIgb24gZXhpdFxudmFyIGNhcnNKdXN0RXhpdGVkID0gbmV3IFNldCgpOyAvLyBUcmFjayBjYXJzIHRoYXQganVzdCBleGl0ZWQgdGhpcyBmcmFtZVxudmFyIHdhdGVyUGh5c2ljc0VuYWJsZWQgPSB0cnVlO1xudmFyIGVycm9yQ291bnQgPSAwO1xudmFyIG1heEVycm9ycyA9IDEwO1xuXG5mdW5jdGlvbiBjcmVhdGVXYXRlclpvbmUod29ybGQsIHBvc2l0aW9uLCB3aWR0aCwgZGVwdGgpIHtcbiAgLy8gQ3JlYXRlIHdhdGVyIHNlbnNvciB6b25lXG4gIHZhciB3YXRlcl9ib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcbiAgLy8gUG9zaXRpb24gd2F0ZXIgem9uZSBpbiB0aGUgbWlkZGxlIG9mIHRoZSBkZXB0aFxuICB3YXRlcl9ib2R5X2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCArIHdpZHRoLzIsIHBvc2l0aW9uLnkgLSBkZXB0aC8yKTtcbiAgXG4gIHZhciB3YXRlcl9ib2R5ID0gd29ybGQuQ3JlYXRlQm9keSh3YXRlcl9ib2R5X2RlZik7XG4gIHZhciB3YXRlcl9maXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICB3YXRlcl9maXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIHdhdGVyX2ZpeF9kZWYuc2hhcGUuU2V0QXNCb3god2lkdGgvMiwgZGVwdGgvMik7XG4gIHdhdGVyX2ZpeF9kZWYuaXNTZW5zb3IgPSB0cnVlOyAvLyBXYXRlciBpcyBhIHNlbnNvciwgbm90IHNvbGlkXG4gIHdhdGVyX2ZpeF9kZWYudXNlckRhdGEgPSB7IHR5cGU6IFwid2F0ZXJcIiwgZGVwdGg6IGRlcHRoLCB3aWR0aDogd2lkdGggfTtcbiAgXG4gIHdhdGVyX2JvZHkuQ3JlYXRlRml4dHVyZSh3YXRlcl9maXhfZGVmKTtcbiAgXG4gIC8vIENyZWF0ZSBzb2xpZCB3YWxscyBhbmQgZmxvb3JcbiAgdmFyIHdhbGxUaGlja25lc3MgPSAwLjI7XG4gIFxuICAvLyBMZWZ0IHdhbGxcbiAgdmFyIGxlZnRfd2FsbF9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIGxlZnRfd2FsbF9kZWYucG9zaXRpb24uU2V0KHBvc2l0aW9uLnggLSB3YWxsVGhpY2tuZXNzLzIsIHBvc2l0aW9uLnkgLSBkZXB0aC8yKTtcbiAgdmFyIGxlZnRfd2FsbCA9IHdvcmxkLkNyZWF0ZUJvZHkobGVmdF93YWxsX2RlZik7XG4gIHZhciBsZWZ0X3dhbGxfZml4ID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBsZWZ0X3dhbGxfZml4LnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGxlZnRfd2FsbF9maXguc2hhcGUuU2V0QXNCb3god2FsbFRoaWNrbmVzcy8yLCBkZXB0aC8yICsgMC41KTsgLy8gRXh0cmEgaGVpZ2h0IGFib3ZlIHdhdGVyXG4gIGxlZnRfd2FsbF9maXguZnJpY3Rpb24gPSAwLjM7XG4gIGxlZnRfd2FsbC5DcmVhdGVGaXh0dXJlKGxlZnRfd2FsbF9maXgpO1xuICBcbiAgLy8gUmlnaHQgd2FsbFxuICB2YXIgcmlnaHRfd2FsbF9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIHJpZ2h0X3dhbGxfZGVmLnBvc2l0aW9uLlNldChwb3NpdGlvbi54ICsgd2lkdGggKyB3YWxsVGhpY2tuZXNzLzIsIHBvc2l0aW9uLnkgLSBkZXB0aC8yKTtcbiAgdmFyIHJpZ2h0X3dhbGwgPSB3b3JsZC5DcmVhdGVCb2R5KHJpZ2h0X3dhbGxfZGVmKTtcbiAgdmFyIHJpZ2h0X3dhbGxfZml4ID0gbmV3IGIyRml4dHVyZURlZigpO1xuICByaWdodF93YWxsX2ZpeC5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xuICByaWdodF93YWxsX2ZpeC5zaGFwZS5TZXRBc0JveCh3YWxsVGhpY2tuZXNzLzIsIGRlcHRoLzIgKyAwLjUpO1xuICByaWdodF93YWxsX2ZpeC5mcmljdGlvbiA9IDAuMztcbiAgcmlnaHRfd2FsbC5DcmVhdGVGaXh0dXJlKHJpZ2h0X3dhbGxfZml4KTtcbiAgXG4gIC8vIEJvdHRvbSBmbG9vclxuICB2YXIgZmxvb3JfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICBmbG9vcl9kZWYucG9zaXRpb24uU2V0KHBvc2l0aW9uLnggKyB3aWR0aC8yLCBwb3NpdGlvbi55IC0gZGVwdGggLSB3YWxsVGhpY2tuZXNzLzIpO1xuICB2YXIgZmxvb3IgPSB3b3JsZC5DcmVhdGVCb2R5KGZsb29yX2RlZik7XG4gIHZhciBmbG9vcl9maXggPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIGZsb29yX2ZpeC5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xuICBmbG9vcl9maXguc2hhcGUuU2V0QXNCb3god2lkdGgvMiArIHdhbGxUaGlja25lc3MsIHdhbGxUaGlja25lc3MvMik7XG4gIGZsb29yX2ZpeC5mcmljdGlvbiA9IDAuNTtcbiAgZmxvb3IuQ3JlYXRlRml4dHVyZShmbG9vcl9maXgpO1xuICBcbiAgdmFyIHdhdGVyWm9uZSA9IHtcbiAgICBib2R5OiB3YXRlcl9ib2R5LFxuICAgIGxlZnRXYWxsOiBsZWZ0X3dhbGwsXG4gICAgcmlnaHRXYWxsOiByaWdodF93YWxsLFxuICAgIGZsb29yOiBmbG9vcixcbiAgICBwb3NpdGlvbjogcG9zaXRpb24sXG4gICAgd2lkdGg6IHdpZHRoLFxuICAgIGRlcHRoOiBkZXB0aCxcbiAgICBkcmFnQ29lZmZpY2llbnQ6IDAuNSxcbiAgICBidW95YW5jeUZhY3RvcjogMC4xNVxuICB9O1xuICBcbiAgd2F0ZXJab25lcy5wdXNoKHdhdGVyWm9uZSk7XG4gIHJldHVybiB3YXRlclpvbmU7XG59XG5cbmZ1bmN0aW9uIGFwcGx5V2F0ZXJGb3JjZXMoY2FyLCB3YXRlckRhdGEpIHtcbiAgXG4gIGlmICghd2F0ZXJQaHlzaWNzRW5hYmxlZCkge1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuV0FSTiwgXCJXYXRlciBwaHlzaWNzIGRpc2FibGVkXCIpO1xuICAgIHJldHVybjsgLy8gV2F0ZXIgcGh5c2ljcyBkaXNhYmxlZCBkdWUgdG8gZXJyb3JzXG4gIH1cbiAgXG4gIGlmICghY2FyIHx8ICFjYXIuY2hhc3NpcyB8fCAhY2FyLndoZWVscyB8fCAhd2F0ZXJEYXRhKSB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5XQVJOLCBcIk1pc3NpbmcgY2FyIGRhdGE6XCIsICEhY2FyLCAhIShjYXIgJiYgY2FyLmNoYXNzaXMpLCAhIShjYXIgJiYgY2FyLndoZWVscyksICEhd2F0ZXJEYXRhKTtcbiAgICByZXR1cm47IC8vIFNhZmV0eSBjaGVja1xuICB9XG4gIFxuICAvLyBEb3VibGUtY2hlY2sgaWYgY2FyIHNob3VsZCBzdGlsbCBiZSBpbiB3YXRlclxuICBpZiAoIWNhci5jYXJJbmRleCAmJiBjYXIuY2FySW5kZXggIT09IDApIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLldBUk4sIFwiQ2FyIG1pc3NpbmcgY2FySW5kZXhcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIFxuICBpZiAoIWNhcnNJbldhdGVyLmhhcyhjYXIuY2FySW5kZXgpKSB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5XQVJOLCBcIkFwcGx5aW5nIHdhdGVyIGZvcmNlcyB0byBjYXJcIiwgY2FyLmNhckluZGV4LCBcIm5vdCBpbiB3YXRlciByZWdpc3RyeVwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIC8vIENSSVRJQ0FMOiBEb24ndCBhcHBseSBmb3JjZXMgdG8gY2FycyB0aGF0IGp1c3QgZXhpdGVkIHRoaXMgZnJhbWVcbiAgaWYgKGNhcnNKdXN0RXhpdGVkLmhhcyhjYXIuY2FySW5kZXgpKSB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJTa2lwcGluZyB3YXRlciBmb3JjZXMgZm9yIGNhclwiLCBjYXIuY2FySW5kZXgsIFwidGhhdCBqdXN0IGV4aXRlZFwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIHZhciBjaGFzc2lzID0gY2FyLmNoYXNzaXM7XG4gIHZhciB3aGVlbHMgPSBjYXIud2hlZWxzO1xuICBcbiAgLy8gU3RvcmUgY2FyIHJlZmVyZW5jZSBmb3IgZm9yY2UgY2xlYXJpbmdcbiAgY2FyUmVmZXJlbmNlcy5zZXQoY2FyLmNhckluZGV4LCBjYXIpO1xuICBcbiAgdHJ5IHtcbiAgICAvLyBDaGVjayBpZiBjaGFzc2lzIGlzIHN0aWxsIHZhbGlkIChub3QgZGVzdHJveWVkKVxuICAgIGlmICghY2hhc3Npcy5Jc0FjdGl2ZSgpKSB7XG4gICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXIuY2FySW5kZXgsIFwiY2hhc3NpcyBpcyBpbmFjdGl2ZSwgcmVtb3ZpbmcgZnJvbSB3YXRlclwiKTtcbiAgICAgIHVucmVnaXN0ZXJDYXJGcm9tV2F0ZXIoY2FyLmNhckluZGV4KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgLy8gVkVMT0NJVFktQkFTRUQgV0FURVIgUEhZU0lDUzogRGlyZWN0bHkgY29udHJvbCB2ZWxvY2l0eSBpbnN0ZWFkIG9mIGFwcGx5aW5nIGZvcmNlc1xuICAgIHZhciB2ZWxvY2l0eSA9IGNoYXNzaXMuR2V0TGluZWFyVmVsb2NpdHkoKTtcbiAgICBpZiAoIXZlbG9jaXR5KSByZXR1cm47XG4gICAgXG4gICAgLy8gU2ltcGxlIGFwcHJvYWNoOiBpZiBzaW5raW5nIChuZWdhdGl2ZSBZIHZlbG9jaXR5KSwgZ2l2ZSBnZW50bGUgdXB3YXJkIHZlbG9jaXR5XG4gICAgaWYgKHZlbG9jaXR5LnkgPCAwLjUpIHtcbiAgICAgIC8vIFNldCBnZW50bGUgdXB3YXJkIHZlbG9jaXR5IGZvciBmbG9hdGluZ1xuICAgICAgY2hhc3Npcy5TZXRMaW5lYXJWZWxvY2l0eShuZXcgYjJWZWMyKHZlbG9jaXR5LngsIDAuNSkpO1xuICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FyLmNhckluZGV4LCBcInNldCB0byBmbG9hdCB3aXRoIHZlbG9jaXR5IDAuNVwiKTtcbiAgICB9XG4gICAgXG4gICAgLy8gSGFuZGxlIHdoZWVscyB3aXRoIHNhbWUgYXBwcm9hY2hcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHdoZWVscy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHdoZWVsID0gd2hlZWxzW2ldO1xuICAgICAgaWYgKHdoZWVsICYmIHdoZWVsLklzQWN0aXZlKCkpIHtcbiAgICAgICAgdmFyIHdoZWVsVmVsb2NpdHkgPSB3aGVlbC5HZXRMaW5lYXJWZWxvY2l0eSgpO1xuICAgICAgICBpZiAod2hlZWxWZWxvY2l0eSAmJiB3aGVlbFZlbG9jaXR5LnkgPCAwLjMpIHtcbiAgICAgICAgICB3aGVlbC5TZXRMaW5lYXJWZWxvY2l0eShuZXcgYjJWZWMyKHdoZWVsVmVsb2NpdHkueCwgMC4zKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBlcnJvckNvdW50Kys7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5FUlJPUiwgXCJFcnJvciBhcHBseWluZyB3YXRlciBmb3JjZXM6XCIsIGUsIFwiRXJyb3IgY291bnQ6XCIsIGVycm9yQ291bnQpO1xuICAgIFxuICAgIGlmIChlcnJvckNvdW50ID49IG1heEVycm9ycykge1xuICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5FUlJPUiwgXCJUb28gbWFueSB3YXRlciBwaHlzaWNzIGVycm9ycyEgRGlzYWJsaW5nIHdhdGVyIHBoeXNpY3NcIik7XG4gICAgICB3YXRlclBoeXNpY3NFbmFibGVkID0gZmFsc2U7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzSW5XYXRlcihjYXJJZCkge1xuICByZXR1cm4gY2Fyc0luV2F0ZXIuaGFzKGNhcklkKTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDYXJQYXJ0SW5XYXRlcihjYXJJZCwgcGFydE5hbWUsIHdhdGVyVXNlckRhdGEpIHtcbiAgaWYgKCFjYXJQYXJ0c0luV2F0ZXIuaGFzKGNhcklkKSkge1xuICAgIGNhclBhcnRzSW5XYXRlci5zZXQoY2FySWQsIG5ldyBTZXQoKSk7XG4gIH1cbiAgXG4gIHZhciBwYXJ0cyA9IGNhclBhcnRzSW5XYXRlci5nZXQoY2FySWQpO1xuICBwYXJ0cy5hZGQocGFydE5hbWUpO1xuICBcbiAgLy8gT25seSByZWdpc3RlciBjYXIgaW4gd2F0ZXIgaWYgaXQgd2Fzbid0IGFscmVhZHlcbiAgaWYgKCFjYXJzSW5XYXRlci5oYXMoY2FySWQpKSB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySWQsIFwicmVnaXN0ZXJlZCBpbiB3YXRlclwiKTtcbiAgICBjYXJzSW5XYXRlci5zZXQoY2FySWQsIHdhdGVyVXNlckRhdGEpO1xuICB9XG4gIFxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXJJZCwgXCJwYXJ0XCIsIHBhcnROYW1lLCBcImVudGVyZWQgd2F0ZXIuIFRvdGFsIHBhcnRzIGluIHdhdGVyOlwiLCBwYXJ0cy5zaXplKTtcbn1cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNhclBhcnRGcm9tV2F0ZXIoY2FySWQsIHBhcnROYW1lKSB7XG4gIGlmICghY2FyUGFydHNJbldhdGVyLmhhcyhjYXJJZCkpIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIlRyaWVkIHRvIHVucmVnaXN0ZXIgcGFydFwiLCBwYXJ0TmFtZSwgXCJmcm9tIGNhclwiLCBjYXJJZCwgXCJidXQgY2FyIGhhcyBubyBwYXJ0cyBpbiB3YXRlclwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIHZhciBwYXJ0cyA9IGNhclBhcnRzSW5XYXRlci5nZXQoY2FySWQpO1xuICBwYXJ0cy5kZWxldGUocGFydE5hbWUpO1xuICBcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySWQsIFwicGFydFwiLCBwYXJ0TmFtZSwgXCJleGl0ZWQgd2F0ZXIuIFJlbWFpbmluZyBwYXJ0cyBpbiB3YXRlcjpcIiwgcGFydHMuc2l6ZSk7XG4gIFxuICAvLyBJTU1FRElBVEUgQ0xFQU5VUDogUmVtb3ZlIGNhciBmcm9tIHdhdGVyIHRyYWNraW5nIGltbWVkaWF0ZWx5IHdoZW4gYW55IG1ham9yIHBhcnQgZXhpdHNcbiAgaWYgKHBhcnROYW1lID09PSBcImNoYXNzaXNcIiB8fCBwYXJ0cy5zaXplID09PSAwKSB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySWQsIFwiZXhpdGluZyB3YXRlciAoY2hhc3NpcyBvciBhbGwgcGFydHMgb3V0KSAtIGltbWVkaWF0ZSBjbGVhbnVwXCIpO1xuICAgIFxuICAgIC8vIEltbWVkaWF0ZSByZW1vdmFsIGZyb20gYWxsIHRyYWNraW5nXG4gICAgY2Fyc0luV2F0ZXIuZGVsZXRlKGNhcklkKTtcbiAgICBjYXJQYXJ0c0luV2F0ZXIuZGVsZXRlKGNhcklkKTtcbiAgICBjYXJzSnVzdEV4aXRlZC5hZGQoY2FySWQpO1xuICAgIFxuICAgIC8vIENSSVRJQ0FMOiBJbW1lZGlhdGVseSBjbGVhciBmb3JjZXMgYW5kIHJlc2V0IHZlbG9jaXR5XG4gICAgY2xlYXJDYXJGb3JjZXMoY2FySWQpO1xuICAgIFxuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQ2FyXCIsIGNhcklkLCBcImNvbXBsZXRlbHkgcmVtb3ZlZCBmcm9tIHdhdGVyIHRyYWNraW5nXCIpO1xuICB9XG59XG5cbi8vIEtlZXAgb2xkIGZ1bmN0aW9ucyBmb3IgY29tcGF0aWJpbGl0eSBidXQgcmVkaXJlY3QgdG8gbmV3IG9uZXNcbmZ1bmN0aW9uIHJlZ2lzdGVyQ2FySW5XYXRlcihjYXJJZCwgd2F0ZXJVc2VyRGF0YSkge1xuICByZWdpc3RlckNhclBhcnRJbldhdGVyKGNhcklkLCBcInVua25vd25cIiwgd2F0ZXJVc2VyRGF0YSk7XG59XG5cbmZ1bmN0aW9uIHVucmVnaXN0ZXJDYXJGcm9tV2F0ZXIoY2FySWQpIHtcbiAgLy8gRm9yY2UgdW5yZWdpc3RlciBhbGwgcGFydHNcbiAgaWYgKGNhclBhcnRzSW5XYXRlci5oYXMoY2FySWQpKSB7XG4gICAgY2FyUGFydHNJbldhdGVyLmRlbGV0ZShjYXJJZCk7XG4gIH1cbiAgaWYgKGNhcnNJbldhdGVyLmhhcyhjYXJJZCkpIHtcbiAgICBjYXJzSW5XYXRlci5kZWxldGUoY2FySWQpO1xuICB9XG4gIGNsZWFyQ2FyRm9yY2VzKGNhcklkKTtcbn1cblxuZnVuY3Rpb24gY2xlYXJDYXJGb3JjZXMoY2FySWQpIHtcbiAgdmFyIGNhclJlZiA9IGNhclJlZmVyZW5jZXMuZ2V0KGNhcklkKTtcbiAgaWYgKGNhclJlZiAmJiBjYXJSZWYuY2hhc3NpcyAmJiBjYXJSZWYuY2hhc3Npcy5Jc0FjdGl2ZSgpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB2ZWxvY2l0eSA9IGNhclJlZi5jaGFzc2lzLkdldExpbmVhclZlbG9jaXR5KCk7XG4gICAgICBcbiAgICAgIC8vIFNJTVBMRSBFWElUOiBKdXN0IGxldCBncmF2aXR5IHdvcmsgbmF0dXJhbGx5LCBubyBzcGVjaWFsIGZvcmNlc1xuICAgICAgaWYgKHZlbG9jaXR5KSB7XG4gICAgICAgIC8vIE9ubHkgcmVzZXQgdG8gemVybyBpZiBmbG9hdGluZyB1cCwgb3RoZXJ3aXNlIGxldCBncmF2aXR5IHdvcmtcbiAgICAgICAgaWYgKHZlbG9jaXR5LnkgPiAwKSB7XG4gICAgICAgICAgY2FyUmVmLmNoYXNzaXMuU2V0TGluZWFyVmVsb2NpdHkobmV3IGIyVmVjMih2ZWxvY2l0eS54LCAwKSk7XG4gICAgICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySWQsIFwidXB3YXJkIHZlbG9jaXR5IHJlc2V0IHRvIDAgb24gZXhpdFwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXJSZWYuY2hhc3Npcy5TZXRBbmd1bGFyVmVsb2NpdHkoMCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFJlc2V0IHdoZWVsIHZlbG9jaXRpZXMgc2ltaWxhcmx5XG4gICAgICBpZiAoY2FyUmVmLndoZWVscykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhclJlZi53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgd2hlZWwgPSBjYXJSZWYud2hlZWxzW2ldO1xuICAgICAgICAgIGlmICh3aGVlbCAmJiB3aGVlbC5Jc0FjdGl2ZSgpKSB7XG4gICAgICAgICAgICB2YXIgd2hlZWxWZWwgPSB3aGVlbC5HZXRMaW5lYXJWZWxvY2l0eSgpO1xuICAgICAgICAgICAgaWYgKHdoZWVsVmVsICYmIHdoZWVsVmVsLnkgPiAwKSB7XG4gICAgICAgICAgICAgIHdoZWVsLlNldExpbmVhclZlbG9jaXR5KG5ldyBiMlZlYzIod2hlZWxWZWwueCwgMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hlZWwuU2V0QW5ndWxhclZlbG9jaXR5KDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBDbGVhciBhY2N1bXVsYXRlZCBmb3JjZSB0cmFja2luZ1xuICAgICAgaWYgKGNhckV4aXRGb3JjZXMuaGFzKGNhcklkKSkge1xuICAgICAgICBjYXJFeGl0Rm9yY2VzLmRlbGV0ZShjYXJJZCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQ2FyXCIsIGNhcklkLCBcIndhdGVyIGV4aXQgLSB2ZWxvY2l0eSBub3JtYWxpemVkXCIpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuRVJST1IsIFwiRXJyb3IgY2xlYXJpbmcgZm9yY2VzIGZvciBjYXJcIiwgY2FySWQsIFwiOlwiLCBlKTtcbiAgICB9XG4gIH1cbiAgXG4gIGNhclJlZmVyZW5jZXMuZGVsZXRlKGNhcklkKTtcbn1cblxuZnVuY3Rpb24gY2xlYXJGcmFtZUV4aXRUcmFja2luZygpIHtcbiAgLy8gQ2xlYXIgdGhlIHNldCBvZiBjYXJzIHRoYXQgZXhpdGVkIHRoaXMgZnJhbWUgLSBjYWxsZWQgYXQgdGhlIHN0YXJ0IG9mIGVhY2ggcGh5c2ljcyBzdGVwXG4gIGNhcnNKdXN0RXhpdGVkLmNsZWFyKCk7XG59XG5cbi8vIEV4cG9ydCBpbnRlcm5hbCBmdW5jdGlvbnMgZm9yIGNvbGxpc2lvbiBoYW5kbGluZ1xubW9kdWxlLmV4cG9ydHMucmVnaXN0ZXJDYXJJbldhdGVyID0gcmVnaXN0ZXJDYXJJbldhdGVyO1xubW9kdWxlLmV4cG9ydHMudW5yZWdpc3RlckNhckZyb21XYXRlciA9IHVucmVnaXN0ZXJDYXJGcm9tV2F0ZXI7XG5tb2R1bGUuZXhwb3J0cy5yZWdpc3RlckNhclBhcnRJbldhdGVyID0gcmVnaXN0ZXJDYXJQYXJ0SW5XYXRlcjtcbm1vZHVsZS5leHBvcnRzLnVucmVnaXN0ZXJDYXJQYXJ0RnJvbVdhdGVyID0gdW5yZWdpc3RlckNhclBhcnRGcm9tV2F0ZXI7XG5tb2R1bGUuZXhwb3J0cy5nZXRXYXRlclpvbmVzID0gZnVuY3Rpb24oKSB7IHJldHVybiB3YXRlclpvbmVzOyB9O1xubW9kdWxlLmV4cG9ydHMuZ2V0Q2Fyc0luV2F0ZXIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGNhcnNJbldhdGVyOyB9O1xubW9kdWxlLmV4cG9ydHMuY2xlYXJXYXRlclpvbmVzID0gZnVuY3Rpb24oKSB7IFxuICB3YXRlclpvbmVzID0gW107XG4gIGNhcnNJbldhdGVyLmNsZWFyKCk7XG4gIGNhclBhcnRzSW5XYXRlci5jbGVhcigpO1xuICBjYXJSZWZlcmVuY2VzLmNsZWFyKCk7XG4gIGNhckV4aXRGb3JjZXMuY2xlYXIoKTtcbiAgY2Fyc0p1c3RFeGl0ZWQuY2xlYXIoKTtcbiAgd2F0ZXJQaHlzaWNzRW5hYmxlZCA9IHRydWU7XG4gIGVycm9yQ291bnQgPSAwO1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIldhdGVyIHpvbmVzIGNsZWFyZWQsIHBoeXNpY3MgcmUtZW5hYmxlZFwiKTtcbn07Il19
