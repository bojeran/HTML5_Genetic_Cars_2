(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* globals document confirm btoa */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");

var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;


// ======= WORLD STATE ======

var $graphList = document.querySelector("#graph-list");
var $graphTemplate = document.querySelector("#graph-template");

function stringToHTML(s){
  var temp = document.createElement('div');
  temp.innerHTML = s;
  return temp.children[0];
}

var states, runners, results, graphState = {};

function updateUI(key, scores){
  var $graph = $graphList.querySelector("#graph-" + key);
  var $newGraph = stringToHTML($graphTemplate.innerHTML);
  $newGraph.id = "graph-" + key;
  if($graph){
    $graphList.replaceChild($graph, $newGraph);
  } else {
    $graphList.appendChild($newGraph);
  }
  // Debug: console.log($newGraph);
  var scatterPlotElem = $newGraph.querySelector(".scatterplot");
  scatterPlotElem.id = "graph-" + key + "-scatter";
  graphState[key] = plot_graphs(
    $newGraph.querySelector(".graphcanvas"),
    $newGraph.querySelector(".topscores"),
    scatterPlotElem,
    graphState[key],
    scores,
    {}
  );
}

var generationConfig = require("./generation-config");

var box2dfps = 60;
var max_car_health = box2dfps * 10;

var world_def = {
  gravity: new b2Vec2(0.0, -9.81),
  doSleep: true,
  floorseed: btoa(Math.seedrandom()),
  tileDimensions: new b2Vec2(1.5, 0.15),
  maxFloorTiles: 200,
  mutable_floor: false,
  box2dfps: box2dfps,
  motorSpeed: 20,
  max_car_health: max_car_health,
  schema: generationConfig.constants.schema
}

var manageRound = {
  genetic: require("./machine-learning/genetic-algorithm/manage-round.js"),
  annealing: require("./machine-learning/simulated-annealing/manage-round.js"),
};

var createListeners = function(key){
  return {
    preCarStep: function(){},
    carStep: function(){},
    carDeath: function(carInfo){
      carInfo.score.i = states[key].counter;
    },
    generationEnd: function(results){
      handleRoundEnd(key, results);
    }
  }
}

function generationZero(){
  var obj = Object.keys(manageRound).reduce(function(obj, key){
    obj.states[key] = manageRound[key].generationZero(generationConfig());
    obj.runners[key] = worldRun(
      world_def, obj.states[key].generation, createListeners(key)
    );
    obj.results[key] = [];
    graphState[key] = {}
    return obj;
  }, {states: {}, runners: {}, results: {}});
  states = obj.states;
  runners = obj.runners;
  results = obj.results;
}

function handleRoundEnd(key, scores){
  var previousCounter = states[key].counter;
  states[key] = manageRound[key].nextGeneration(
    states[key], scores, generationConfig()
  );
  runners[key] = worldRun(
    world_def, states[key].generation, createListeners(key)
  );
  if(states[key].counter === previousCounter){
    // Debug: console.log(results);
    results[key] = results[key].concat(scores);
  } else {
    handleGenerationEnd(key);
    results[key] = [];
  }
}

function runRound(){
  var toRun = new Map();
  Object.keys(states).forEach(function(key){ toRun.set(key, states[key].counter) });
  // Debug: console.log(toRun);
  while(toRun.size){
    // Debug: console.log("running");
    Array.from(toRun.keys()).forEach(function(key){
      if(states[key].counter === toRun.get(key)){
        runners[key].step();
      } else {
        toRun.delete(key);
      }
    });
  }
}

function handleGenerationEnd(key){
  var scores = results[key];
  scores.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  })
  updateUI(key, scores);
  results[key] = [];
}

function cw_resetPopulationUI() {
  $graphList.innerHTML = "";
}

function cw_resetWorld() {
  cw_resetPopulationUI();
  Math.seedrandom();
  generationZero();
}

document.querySelector("#new-population").addEventListener("click", function(){
  cw_resetPopulationUI()
  generationZero();
})


document.querySelector("#confirm-reset").addEventListener("click", function(){
  cw_confirmResetWorld()
})

document.querySelector("#fast-forward").addEventListener("click", function(){
  runRound();
})

function cw_confirmResetWorld() {
  if (confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

cw_resetWorld();

},{"./draw/plot-graphs.js":6,"./generation-config":10,"./machine-learning/genetic-algorithm/manage-round.js":15,"./machine-learning/simulated-annealing/manage-round.js":17,"./world/run.js":18}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{"./car-constants.json":2}],4:[function(require,module,exports){
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

},{"../logger/logger":13,"../machine-learning/create-instance":14}],5:[function(require,module,exports){
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

},{"../world/water-physics":20}],6:[function(require,module,exports){
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

},{"./scatter-plot":7}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){

module.exports = generateRandom;
function generateRandom(){
  return Math.random();
}

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"../car-schema/construct.js":3,"./generateRandom":8,"./pickParent":11,"./selectFromAllParents":12}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{"./inbreeding-coefficient":9}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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

},{"./random.js":16}],15:[function(require,module,exports){
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

},{"../../logger/logger.js":13,"../create-instance":14}],16:[function(require,module,exports){


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

},{}],17:[function(require,module,exports){
var create = require("../create-instance");

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration,
}

function generationZero(config){
  var oldStructure = create.createGenerationZero(
    config.schema, config.generateRandom
  );
  var newStructure = createStructure(config, 1, oldStructure);

  var k = 0;

  return {
    counter: 0,
    k: k,
    generation: [newStructure, oldStructure]
  }
}

function nextGeneration(previousState, scores, config){
  var nextState = {
    k: (previousState.k + 1)%config.generationSize,
    counter: previousState.counter + (previousState.k === config.generationSize ? 1 : 0)
  };
  // gradually get closer to zero temperature (but never hit it)
  var oldDef = previousState.curDef || previousState.generation[1];
  var oldScore = previousState.score || scores[1].score.v;

  var newDef = previousState.generation[0];
  var newScore = scores[0].score.v;


  var temp = Math.pow(Math.E, -nextState.counter / config.generationSize);

  var scoreDiff = newScore - oldScore;
  // If the next point is higher, change location
  if(scoreDiff > 0){
    nextState.curDef = newDef;
    nextState.score = newScore;
    // Else we want to increase likelyhood of changing location as we get
  } else if(Math.random() > Math.exp(-scoreDiff/(nextState.k * temp))){
    nextState.curDef = newDef;
    nextState.score = newScore;
  } else {
    nextState.curDef = oldDef;
    nextState.score = oldScore;
  }

  // Debug log for simulated annealing
  // console.log(previousState, nextState);

  nextState.generation = [createStructure(config, temp, nextState.curDef)];

  return nextState;
}


function createStructure(config, mutation_range, parent){
  var schema = config.schema,
    gen_mutation = 1,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    mutation_range,
    gen_mutation
  )

}

},{"../create-instance":14}],18:[function(require,module,exports){
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

},{"../car-schema/def-to-car":4,"../car-schema/run":5,"../logger/logger":13,"./setup-scene":19,"./water-physics":20}],19:[function(require,module,exports){
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

},{"../logger/logger":13,"./water-physics":20}],20:[function(require,module,exports){
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
},{"../logger/logger":13}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmFyZS5qcyIsInNyYy9jYXItc2NoZW1hL2Nhci1jb25zdGFudHMuanNvbiIsInNyYy9jYXItc2NoZW1hL2NvbnN0cnVjdC5qcyIsInNyYy9jYXItc2NoZW1hL2RlZi10by1jYXIuanMiLCJzcmMvY2FyLXNjaGVtYS9ydW4uanMiLCJzcmMvZHJhdy9wbG90LWdyYXBocy5qcyIsInNyYy9kcmF3L3NjYXR0ZXItcGxvdC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9nZW5lcmF0ZVJhbmRvbS5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmJyZWVkaW5nLWNvZWZmaWNpZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luZGV4LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3BpY2tQYXJlbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvc2VsZWN0RnJvbUFsbFBhcmVudHMuanMiLCJzcmMvbG9nZ2VyL2xvZ2dlci5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2NyZWF0ZS1pbnN0YW5jZS5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3JhbmRvbS5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3NpbXVsYXRlZC1hbm5lYWxpbmcvbWFuYWdlLXJvdW5kLmpzIiwic3JjL3dvcmxkL3J1bi5qcyIsInNyYy93b3JsZC9zZXR1cC1zY2VuZS5qcyIsInNyYy93b3JsZC93YXRlci1waHlzaWNzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgY29uZmlybSBidG9hICovXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xuLy8gR2xvYmFsIFZhcnNcblxudmFyIHdvcmxkUnVuID0gcmVxdWlyZShcIi4vd29ybGQvcnVuLmpzXCIpO1xuXG52YXIgZ3JhcGhfZm5zID0gcmVxdWlyZShcIi4vZHJhdy9wbG90LWdyYXBocy5qc1wiKTtcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xuXG5cbi8vID09PT09PT0gV09STEQgU1RBVEUgPT09PT09XG5cbnZhciAkZ3JhcGhMaXN0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmFwaC1saXN0XCIpO1xudmFyICRncmFwaFRlbXBsYXRlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmFwaC10ZW1wbGF0ZVwiKTtcblxuZnVuY3Rpb24gc3RyaW5nVG9IVE1MKHMpe1xuICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICB0ZW1wLmlubmVySFRNTCA9IHM7XG4gIHJldHVybiB0ZW1wLmNoaWxkcmVuWzBdO1xufVxuXG52YXIgc3RhdGVzLCBydW5uZXJzLCByZXN1bHRzLCBncmFwaFN0YXRlID0ge307XG5cbmZ1bmN0aW9uIHVwZGF0ZVVJKGtleSwgc2NvcmVzKXtcbiAgdmFyICRncmFwaCA9ICRncmFwaExpc3QucXVlcnlTZWxlY3RvcihcIiNncmFwaC1cIiArIGtleSk7XG4gIHZhciAkbmV3R3JhcGggPSBzdHJpbmdUb0hUTUwoJGdyYXBoVGVtcGxhdGUuaW5uZXJIVE1MKTtcbiAgJG5ld0dyYXBoLmlkID0gXCJncmFwaC1cIiArIGtleTtcbiAgaWYoJGdyYXBoKXtcbiAgICAkZ3JhcGhMaXN0LnJlcGxhY2VDaGlsZCgkZ3JhcGgsICRuZXdHcmFwaCk7XG4gIH0gZWxzZSB7XG4gICAgJGdyYXBoTGlzdC5hcHBlbmRDaGlsZCgkbmV3R3JhcGgpO1xuICB9XG4gIC8vIERlYnVnOiBjb25zb2xlLmxvZygkbmV3R3JhcGgpO1xuICB2YXIgc2NhdHRlclBsb3RFbGVtID0gJG5ld0dyYXBoLnF1ZXJ5U2VsZWN0b3IoXCIuc2NhdHRlcnBsb3RcIik7XG4gIHNjYXR0ZXJQbG90RWxlbS5pZCA9IFwiZ3JhcGgtXCIgKyBrZXkgKyBcIi1zY2F0dGVyXCI7XG4gIGdyYXBoU3RhdGVba2V5XSA9IHBsb3RfZ3JhcGhzKFxuICAgICRuZXdHcmFwaC5xdWVyeVNlbGVjdG9yKFwiLmdyYXBoY2FudmFzXCIpLFxuICAgICRuZXdHcmFwaC5xdWVyeVNlbGVjdG9yKFwiLnRvcHNjb3Jlc1wiKSxcbiAgICBzY2F0dGVyUGxvdEVsZW0sXG4gICAgZ3JhcGhTdGF0ZVtrZXldLFxuICAgIHNjb3JlcyxcbiAgICB7fVxuICApO1xufVxuXG52YXIgZ2VuZXJhdGlvbkNvbmZpZyA9IHJlcXVpcmUoXCIuL2dlbmVyYXRpb24tY29uZmlnXCIpO1xuXG52YXIgYm94MmRmcHMgPSA2MDtcbnZhciBtYXhfY2FyX2hlYWx0aCA9IGJveDJkZnBzICogMTA7XG5cbnZhciB3b3JsZF9kZWYgPSB7XG4gIGdyYXZpdHk6IG5ldyBiMlZlYzIoMC4wLCAtOS44MSksXG4gIGRvU2xlZXA6IHRydWUsXG4gIGZsb29yc2VlZDogYnRvYShNYXRoLnNlZWRyYW5kb20oKSksXG4gIHRpbGVEaW1lbnNpb25zOiBuZXcgYjJWZWMyKDEuNSwgMC4xNSksXG4gIG1heEZsb29yVGlsZXM6IDIwMCxcbiAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXG4gIGJveDJkZnBzOiBib3gyZGZwcyxcbiAgbW90b3JTcGVlZDogMjAsXG4gIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcbiAgc2NoZW1hOiBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5zY2hlbWFcbn1cblxudmFyIG1hbmFnZVJvdW5kID0ge1xuICBnZW5ldGljOiByZXF1aXJlKFwiLi9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qc1wiKSxcbiAgYW5uZWFsaW5nOiByZXF1aXJlKFwiLi9tYWNoaW5lLWxlYXJuaW5nL3NpbXVsYXRlZC1hbm5lYWxpbmcvbWFuYWdlLXJvdW5kLmpzXCIpLFxufTtcblxudmFyIGNyZWF0ZUxpc3RlbmVycyA9IGZ1bmN0aW9uKGtleSl7XG4gIHJldHVybiB7XG4gICAgcHJlQ2FyU3RlcDogZnVuY3Rpb24oKXt9LFxuICAgIGNhclN0ZXA6IGZ1bmN0aW9uKCl7fSxcbiAgICBjYXJEZWF0aDogZnVuY3Rpb24oY2FySW5mbyl7XG4gICAgICBjYXJJbmZvLnNjb3JlLmkgPSBzdGF0ZXNba2V5XS5jb3VudGVyO1xuICAgIH0sXG4gICAgZ2VuZXJhdGlvbkVuZDogZnVuY3Rpb24ocmVzdWx0cyl7XG4gICAgICBoYW5kbGVSb3VuZEVuZChrZXksIHJlc3VsdHMpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybygpe1xuICB2YXIgb2JqID0gT2JqZWN0LmtleXMobWFuYWdlUm91bmQpLnJlZHVjZShmdW5jdGlvbihvYmosIGtleSl7XG4gICAgb2JqLnN0YXRlc1trZXldID0gbWFuYWdlUm91bmRba2V5XS5nZW5lcmF0aW9uWmVybyhnZW5lcmF0aW9uQ29uZmlnKCkpO1xuICAgIG9iai5ydW5uZXJzW2tleV0gPSB3b3JsZFJ1bihcbiAgICAgIHdvcmxkX2RlZiwgb2JqLnN0YXRlc1trZXldLmdlbmVyYXRpb24sIGNyZWF0ZUxpc3RlbmVycyhrZXkpXG4gICAgKTtcbiAgICBvYmoucmVzdWx0c1trZXldID0gW107XG4gICAgZ3JhcGhTdGF0ZVtrZXldID0ge31cbiAgICByZXR1cm4gb2JqO1xuICB9LCB7c3RhdGVzOiB7fSwgcnVubmVyczoge30sIHJlc3VsdHM6IHt9fSk7XG4gIHN0YXRlcyA9IG9iai5zdGF0ZXM7XG4gIHJ1bm5lcnMgPSBvYmoucnVubmVycztcbiAgcmVzdWx0cyA9IG9iai5yZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVSb3VuZEVuZChrZXksIHNjb3Jlcyl7XG4gIHZhciBwcmV2aW91c0NvdW50ZXIgPSBzdGF0ZXNba2V5XS5jb3VudGVyO1xuICBzdGF0ZXNba2V5XSA9IG1hbmFnZVJvdW5kW2tleV0ubmV4dEdlbmVyYXRpb24oXG4gICAgc3RhdGVzW2tleV0sIHNjb3JlcywgZ2VuZXJhdGlvbkNvbmZpZygpXG4gICk7XG4gIHJ1bm5lcnNba2V5XSA9IHdvcmxkUnVuKFxuICAgIHdvcmxkX2RlZiwgc3RhdGVzW2tleV0uZ2VuZXJhdGlvbiwgY3JlYXRlTGlzdGVuZXJzKGtleSlcbiAgKTtcbiAgaWYoc3RhdGVzW2tleV0uY291bnRlciA9PT0gcHJldmlvdXNDb3VudGVyKXtcbiAgICAvLyBEZWJ1ZzogY29uc29sZS5sb2cocmVzdWx0cyk7XG4gICAgcmVzdWx0c1trZXldID0gcmVzdWx0c1trZXldLmNvbmNhdChzY29yZXMpO1xuICB9IGVsc2Uge1xuICAgIGhhbmRsZUdlbmVyYXRpb25FbmQoa2V5KTtcbiAgICByZXN1bHRzW2tleV0gPSBbXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBydW5Sb3VuZCgpe1xuICB2YXIgdG9SdW4gPSBuZXcgTWFwKCk7XG4gIE9iamVjdC5rZXlzKHN0YXRlcykuZm9yRWFjaChmdW5jdGlvbihrZXkpeyB0b1J1bi5zZXQoa2V5LCBzdGF0ZXNba2V5XS5jb3VudGVyKSB9KTtcbiAgLy8gRGVidWc6IGNvbnNvbGUubG9nKHRvUnVuKTtcbiAgd2hpbGUodG9SdW4uc2l6ZSl7XG4gICAgLy8gRGVidWc6IGNvbnNvbGUubG9nKFwicnVubmluZ1wiKTtcbiAgICBBcnJheS5mcm9tKHRvUnVuLmtleXMoKSkuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAgaWYoc3RhdGVzW2tleV0uY291bnRlciA9PT0gdG9SdW4uZ2V0KGtleSkpe1xuICAgICAgICBydW5uZXJzW2tleV0uc3RlcCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9SdW4uZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlR2VuZXJhdGlvbkVuZChrZXkpe1xuICB2YXIgc2NvcmVzID0gcmVzdWx0c1trZXldO1xuICBzY29yZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIGlmIChhLnNjb3JlLnYgPiBiLnNjb3JlLnYpIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMVxuICAgIH1cbiAgfSlcbiAgdXBkYXRlVUkoa2V5LCBzY29yZXMpO1xuICByZXN1bHRzW2tleV0gPSBbXTtcbn1cblxuZnVuY3Rpb24gY3dfcmVzZXRQb3B1bGF0aW9uVUkoKSB7XG4gICRncmFwaExpc3QuaW5uZXJIVE1MID0gXCJcIjtcbn1cblxuZnVuY3Rpb24gY3dfcmVzZXRXb3JsZCgpIHtcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKTtcbiAgTWF0aC5zZWVkcmFuZG9tKCk7XG4gIGdlbmVyYXRpb25aZXJvKCk7XG59XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbmV3LXBvcHVsYXRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKClcbiAgZ2VuZXJhdGlvblplcm8oKTtcbn0pXG5cblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNjb25maXJtLXJlc2V0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICBjd19jb25maXJtUmVzZXRXb3JsZCgpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zhc3QtZm9yd2FyZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgcnVuUm91bmQoKTtcbn0pXG5cbmZ1bmN0aW9uIGN3X2NvbmZpcm1SZXNldFdvcmxkKCkge1xuICBpZiAoY29uZmlybSgnUmVhbGx5IHJlc2V0IHdvcmxkPycpKSB7XG4gICAgY3dfcmVzZXRXb3JsZCgpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5jd19yZXNldFdvcmxkKCk7XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwid2hlZWxDb3VudFwiOiAyLFxuICBcIndoZWVsTWluUmFkaXVzXCI6IDAuMixcbiAgXCJ3aGVlbFJhZGl1c1JhbmdlXCI6IDAuNSxcbiAgXCJ3aGVlbE1pbkRlbnNpdHlcIjogNDAsXG4gIFwid2hlZWxEZW5zaXR5UmFuZ2VcIjogMTAwLFxuICBcImNoYXNzaXNEZW5zaXR5UmFuZ2VcIjogMzAwLFxuICBcImNoYXNzaXNNaW5EZW5zaXR5XCI6IDMwLFxuICBcImNoYXNzaXNNaW5BeGlzXCI6IDAuMSxcbiAgXCJjaGFzc2lzQXhpc1JhbmdlXCI6IDEuMVxufVxuIiwidmFyIGNhckNvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2Nhci1jb25zdGFudHMuanNvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHdvcmxkRGVmOiB3b3JsZERlZixcbiAgY2FyQ29uc3RhbnRzOiBnZXRDYXJDb25zdGFudHMsXG4gIGdlbmVyYXRlU2NoZW1hOiBnZW5lcmF0ZVNjaGVtYVxufVxuXG5mdW5jdGlvbiB3b3JsZERlZigpe1xuICB2YXIgYm94MmRmcHMgPSA2MDtcbiAgcmV0dXJuIHtcbiAgICBncmF2aXR5OiB7IHk6IDAgfSxcbiAgICBkb1NsZWVwOiB0cnVlLFxuICAgIGZsb29yc2VlZDogXCJhYmNcIixcbiAgICBtYXhGbG9vclRpbGVzOiAyMDAsXG4gICAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXG4gICAgbW90b3JTcGVlZDogMjAsXG4gICAgYm94MmRmcHM6IGJveDJkZnBzLFxuICAgIG1heF9jYXJfaGVhbHRoOiBib3gyZGZwcyAqIDEwLFxuICAgIHRpbGVEaW1lbnNpb25zOiB7XG4gICAgICB3aWR0aDogMS41LFxuICAgICAgaGVpZ2h0OiAwLjE1XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDYXJDb25zdGFudHMoKXtcbiAgcmV0dXJuIGNhckNvbnN0YW50cztcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTY2hlbWEodmFsdWVzKXtcbiAgcmV0dXJuIHtcbiAgICB3aGVlbF9yYWRpdXM6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pblJhZGl1cyxcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxSYWRpdXNSYW5nZSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHdoZWVsX2RlbnNpdHk6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pbkRlbnNpdHksXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsRGVuc2l0eVJhbmdlLFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgY2hhc3Npc19kZW5zaXR5OiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IDEsXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzRGVuc2l0eVJhbmdlLFxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzTWluRGVuc2l0eSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHZlcnRleF9saXN0OiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IDEyLFxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc01pbkF4aXMsXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNBeGlzUmFuZ2UsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICB3aGVlbF92ZXJ0ZXg6IHtcbiAgICAgIHR5cGU6IFwic2h1ZmZsZVwiLFxuICAgICAgbGVuZ3RoOiA4LFxuICAgICAgbGltaXQ6IHZhbHVlcy53aGVlbENvdW50LFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gIH07XG59XG4iLCIvKlxuICBnbG9iYWxzIGIyUmV2b2x1dGVKb2ludERlZiBiMlZlYzIgYjJCb2R5RGVmIGIyQm9keSBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgYjJDaXJjbGVTaGFwZVxuKi9cblxudmFyIGNyZWF0ZUluc3RhbmNlID0gcmVxdWlyZShcIi4uL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlXCIpO1xudmFyIGxvZ2dlciA9IHJlcXVpcmUoXCIuLi9sb2dnZXIvbG9nZ2VyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlZlRvQ2FyO1xuXG5mdW5jdGlvbiBkZWZUb0Nhcihub3JtYWxfZGVmLCB3b3JsZCwgY29uc3RhbnRzKXtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJkZWZUb0NhcjogU3RhcnRpbmcgY2FyIGNvbnN0cnVjdGlvblwiKTtcbiAgdmFyIGNhcl9kZWYgPSBjcmVhdGVJbnN0YW5jZS5hcHBseVR5cGVzKGNvbnN0YW50cy5zY2hlbWEsIG5vcm1hbF9kZWYpXG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiZGVmVG9DYXI6IENhciBkZWYgY3JlYXRlZCwgd2hlZWwgY291bnQ6XCIsIGNhcl9kZWYud2hlZWxfcmFkaXVzLmxlbmd0aCk7XG4gIFxuICB2YXIgaW5zdGFuY2UgPSB7fTtcbiAgaW5zdGFuY2UuY2hhc3NpcyA9IGNyZWF0ZUNoYXNzaXMoXG4gICAgd29ybGQsIGNhcl9kZWYudmVydGV4X2xpc3QsIGNhcl9kZWYuY2hhc3Npc19kZW5zaXR5XG4gICk7XG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiZGVmVG9DYXI6IENoYXNzaXMgY3JlYXRlZFwiKTtcbiAgdmFyIGk7XG5cbiAgdmFyIHdoZWVsQ291bnQgPSBjYXJfZGVmLndoZWVsX3JhZGl1cy5sZW5ndGg7XG5cbiAgaW5zdGFuY2Uud2hlZWxzID0gW107XG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiBDcmVhdGluZyB3aGVlbFwiLCBpKTtcbiAgICBpbnN0YW5jZS53aGVlbHNbaV0gPSBjcmVhdGVXaGVlbChcbiAgICAgIHdvcmxkLFxuICAgICAgY2FyX2RlZi53aGVlbF9yYWRpdXNbaV0sXG4gICAgICBjYXJfZGVmLndoZWVsX2RlbnNpdHlbaV1cbiAgICApO1xuICB9XG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiZGVmVG9DYXI6IEFsbFwiLCB3aGVlbENvdW50LCBcIndoZWVscyBjcmVhdGVkXCIpO1xuXG4gIHZhciBjYXJtYXNzID0gaW5zdGFuY2UuY2hhc3Npcy5HZXRNYXNzKCk7XG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcbiAgICBjYXJtYXNzICs9IGluc3RhbmNlLndoZWVsc1tpXS5HZXRNYXNzKCk7XG4gIH1cblxuICB2YXIgam9pbnRfZGVmID0gbmV3IGIyUmV2b2x1dGVKb2ludERlZigpO1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiBDcmVhdGluZyB3aGVlbCBqb2ludHNcIik7XG5cbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiZGVmVG9DYXI6IENyZWF0aW5nIGpvaW50IGZvciB3aGVlbFwiLCBpKTtcbiAgICB2YXIgdG9ycXVlID0gY2FybWFzcyAqIC1jb25zdGFudHMuZ3Jhdml0eS55IC8gY2FyX2RlZi53aGVlbF9yYWRpdXNbaV07XG5cbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiB3aGVlbF92ZXJ0ZXhbXCIgKyBpICsgXCJdID1cIiwgY2FyX2RlZi53aGVlbF92ZXJ0ZXhbaV0pO1xuICAgIGlmIChjYXJfZGVmLndoZWVsX3ZlcnRleFtpXSA+PSBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0Lmxlbmd0aCkge1xuICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5FUlJPUiwgXCJFUlJPUjogd2hlZWxfdmVydGV4IGluZGV4IG91dCBvZiBib3VuZHMhXCIsIGNhcl9kZWYud2hlZWxfdmVydGV4W2ldLCBcIj49XCIsIGluc3RhbmNlLmNoYXNzaXMudmVydGV4X2xpc3QubGVuZ3RoKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIHJhbmR2ZXJ0ZXggPSBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0W2Nhcl9kZWYud2hlZWxfdmVydGV4W2ldXTtcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JBLlNldChyYW5kdmVydGV4LngsIHJhbmR2ZXJ0ZXgueSk7XG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQi5TZXQoMCwgMCk7XG4gICAgam9pbnRfZGVmLm1heE1vdG9yVG9ycXVlID0gdG9ycXVlO1xuICAgIGpvaW50X2RlZi5tb3RvclNwZWVkID0gLWNvbnN0YW50cy5tb3RvclNwZWVkO1xuICAgIGpvaW50X2RlZi5lbmFibGVNb3RvciA9IHRydWU7XG4gICAgam9pbnRfZGVmLmJvZHlBID0gaW5zdGFuY2UuY2hhc3NpcztcbiAgICBqb2ludF9kZWYuYm9keUIgPSBpbnN0YW5jZS53aGVlbHNbaV07XG4gICAgd29ybGQuQ3JlYXRlSm9pbnQoam9pbnRfZGVmKTtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiBKb2ludCBjcmVhdGVkIGZvciB3aGVlbFwiLCBpKTtcbiAgfVxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcImRlZlRvQ2FyOiBBbGwgam9pbnRzIGNyZWF0ZWRcIik7XG5cbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDaGFzc2lzKHdvcmxkLCB2ZXJ0ZXhzLCBkZW5zaXR5KSB7XG5cbiAgdmFyIHZlcnRleF9saXN0ID0gbmV3IEFycmF5KCk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzBdLCAwKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzFdLCB2ZXJ0ZXhzWzJdKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigwLCB2ZXJ0ZXhzWzNdKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s0XSwgdmVydGV4c1s1XSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbNl0sIDApKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzddLCAtdmVydGV4c1s4XSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgLXZlcnRleHNbOV0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMTBdLCAtdmVydGV4c1sxMV0pKTtcblxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIGJvZHlfZGVmLnR5cGUgPSBiMkJvZHkuYjJfZHluYW1pY0JvZHk7XG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLjAsIDQuMCk7XG5cbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcblxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFswXSwgdmVydGV4X2xpc3RbMV0sIGRlbnNpdHkpO1xuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFsxXSwgdmVydGV4X2xpc3RbMl0sIGRlbnNpdHkpO1xuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFsyXSwgdmVydGV4X2xpc3RbM10sIGRlbnNpdHkpO1xuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFszXSwgdmVydGV4X2xpc3RbNF0sIGRlbnNpdHkpO1xuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs0XSwgdmVydGV4X2xpc3RbNV0sIGRlbnNpdHkpO1xuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs1XSwgdmVydGV4X2xpc3RbNl0sIGRlbnNpdHkpO1xuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs2XSwgdmVydGV4X2xpc3RbN10sIGRlbnNpdHkpO1xuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs3XSwgdmVydGV4X2xpc3RbMF0sIGRlbnNpdHkpO1xuXG4gIGJvZHkudmVydGV4X2xpc3QgPSB2ZXJ0ZXhfbGlzdDtcblxuICByZXR1cm4gYm9keTtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXgxLCB2ZXJ0ZXgyLCBkZW5zaXR5KSB7XG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDEpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDIpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKGIyVmVjMi5NYWtlKDAsIDApKTtcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDEwO1xuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xuICBmaXhfZGVmLmZpbHRlci5ncm91cEluZGV4ID0gLTE7XG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheSh2ZXJ0ZXhfbGlzdCwgMyk7XG5cbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVXaGVlbCh3b3JsZCwgcmFkaXVzLCBkZW5zaXR5KSB7XG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KDAsIDApO1xuXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XG5cbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJDaXJjbGVTaGFwZShyYWRpdXMpO1xuICBmaXhfZGVmLmRlbnNpdHkgPSBkZW5zaXR5O1xuICBmaXhfZGVmLmZyaWN0aW9uID0gMTtcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xuXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcbiAgcmV0dXJuIGJvZHk7XG59XG4iLCJ2YXIgd2F0ZXJQaHlzaWNzID0gcmVxdWlyZShcIi4uL3dvcmxkL3dhdGVyLXBoeXNpY3NcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZXRJbml0aWFsU3RhdGU6IGdldEluaXRpYWxTdGF0ZSxcbiAgdXBkYXRlU3RhdGU6IHVwZGF0ZVN0YXRlLFxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcbiAgY2FsY3VsYXRlU2NvcmU6IGNhbGN1bGF0ZVNjb3JlLFxufTtcblxuZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZil7XG4gIHJldHVybiB7XG4gICAgZnJhbWVzOiAwLFxuICAgIGhlYWx0aDogd29ybGRfZGVmLm1heF9jYXJfaGVhbHRoLFxuICAgIG1heFBvc2l0aW9ueTogMCxcbiAgICBtaW5Qb3NpdGlvbnk6IDAsXG4gICAgbWF4UG9zaXRpb254OiAwLFxuICAgIGZyYW1lc0luV2F0ZXI6IDAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKGNvbnN0YW50cywgd29ybGRDb25zdHJ1Y3QsIHN0YXRlKXtcbiAgaWYoc3RhdGUuaGVhbHRoIDw9IDApe1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFscmVhZHkgRGVhZFwiKTtcbiAgfVxuICBpZihzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSBGaW5pc2hlZFwiKTtcbiAgfVxuXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlKTtcbiAgLy8gY2hlY2sgaGVhbHRoXG4gIHZhciBwb3NpdGlvbiA9IHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcbiAgLy8gY2hlY2sgaWYgY2FyIHJlYWNoZWQgZW5kIG9mIHRoZSBwYXRoXG4gIHZhciBuZXh0U3RhdGUgPSB7XG4gICAgZnJhbWVzOiBzdGF0ZS5mcmFtZXMgKyAxLFxuICAgIG1heFBvc2l0aW9ueDogcG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCA/IHBvc2l0aW9uLnggOiBzdGF0ZS5tYXhQb3NpdGlvbngsXG4gICAgbWF4UG9zaXRpb255OiBwb3NpdGlvbi55ID4gc3RhdGUubWF4UG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1heFBvc2l0aW9ueSxcbiAgICBtaW5Qb3NpdGlvbnk6IHBvc2l0aW9uLnkgPCBzdGF0ZS5taW5Qb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWluUG9zaXRpb255XG4gIH07XG5cbiAgaWYgKHBvc2l0aW9uLnggPiBjb25zdGFudHMuZmluaXNoTGluZSkge1xuICAgIHJldHVybiBuZXh0U3RhdGU7XG4gIH1cblxuICBpZiAocG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCArIDAuMDIpIHtcbiAgICBuZXh0U3RhdGUuaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xuICAgIG5leHRTdGF0ZS5mcmFtZXNJbldhdGVyID0gMDtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG4gIFxuICAvLyBDaGVjayBpZiBjYXIgaXMgaW4gd2F0ZXJcbiAgdmFyIGNhckluZGV4ID0gd29ybGRDb25zdHJ1Y3QuY2FySW5kZXggfHwgMDsgLy8gTmVlZCB0byBwYXNzIGNhciBpbmRleCBmcm9tIHdvcmxkL3J1bi5qc1xuICB2YXIgaXNJbldhdGVyID0gd2F0ZXJQaHlzaWNzLmlzSW5XYXRlcihjYXJJbmRleCk7XG4gIFxuICBpZiAoaXNJbldhdGVyKSB7XG4gICAgbmV4dFN0YXRlLmZyYW1lc0luV2F0ZXIgPSBzdGF0ZS5mcmFtZXNJbldhdGVyICsgMTtcbiAgICAvLyBMb3NlIGhlYWx0aCBzbGlnaHRseSBmYXN0ZXIgaW4gd2F0ZXIsIGJ1dCBub3QgdG9vIG11Y2hcbiAgICBuZXh0U3RhdGUuaGVhbHRoID0gc3RhdGUuaGVhbHRoIC0gMjsgLy8gUmVkdWNlZCBmcm9tIC0zIHRvIC0yXG4gICAgXG4gICAgLy8gRXh0cmEgcGVuYWx0eSBmb3IgYmVpbmcgc3R1Y2sgaW4gd2F0ZXIgdG9vIGxvbmcgKGJ1dCBvbmx5IGFmdGVyIGxvbmdlciB0aW1lKVxuICAgIGlmIChuZXh0U3RhdGUuZnJhbWVzSW5XYXRlciA+IDE4MCkgeyAvLyBNb3JlIHRoYW4gMyBzZWNvbmRzIGF0IDYwZnBzICh3YXMgMSBzZWNvbmQpXG4gICAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDE7IC8vIFJlZHVjZWQgZnJvbSAtMiB0byAtMVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBuZXh0U3RhdGUuZnJhbWVzSW5XYXRlciA9IDA7XG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IHN0YXRlLmhlYWx0aCAtIDE7XG4gIH1cbiAgXG4gIGlmIChNYXRoLmFicyh3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldExpbmVhclZlbG9jaXR5KCkueCkgPCAwLjAwMSkge1xuICAgIG5leHRTdGF0ZS5oZWFsdGggLT0gNTtcbiAgfVxuICByZXR1cm4gbmV4dFN0YXRlO1xufVxuXG5mdW5jdGlvbiBnZXRTdGF0dXMoc3RhdGUsIGNvbnN0YW50cyl7XG4gIGlmKGhhc0ZhaWxlZChzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIC0xO1xuICBpZihoYXNTdWNjZXNzKHN0YXRlLCBjb25zdGFudHMpKSByZXR1cm4gMTtcbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGhhc0ZhaWxlZChzdGF0ZSAvKiwgY29uc3RhbnRzICovKXtcbiAgcmV0dXJuIHN0YXRlLmhlYWx0aCA8PSAwO1xufVxuZnVuY3Rpb24gaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKXtcbiAgcmV0dXJuIHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lO1xufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVTY29yZShzdGF0ZSwgY29uc3RhbnRzKXtcbiAgdmFyIGF2Z3NwZWVkID0gKHN0YXRlLm1heFBvc2l0aW9ueCAvIHN0YXRlLmZyYW1lcykgKiBjb25zdGFudHMuYm94MmRmcHM7XG4gIHZhciBwb3NpdGlvbiA9IHN0YXRlLm1heFBvc2l0aW9ueDtcbiAgdmFyIHNjb3JlID0gcG9zaXRpb24gKyBhdmdzcGVlZDtcbiAgXG4gIC8vIEJvbnVzIGZvciBzdWNjZXNzZnVsbHkgY3Jvc3Npbmcgd2F0ZXIgKHNwZW50IHRpbWUgaW4gd2F0ZXIgYnV0IGRpZG4ndCBkaWUpXG4gIGlmIChzdGF0ZS5mcmFtZXNJbldhdGVyID4gMCAmJiBzdGF0ZS5oZWFsdGggPiAwKSB7XG4gICAgc2NvcmUgKz0gNTsgLy8gU21hbGwgYm9udXMgZm9yIHdhdGVyIHN1cnZpdmFsXG4gIH1cbiAgXG4gIHJldHVybiB7XG4gICAgdjogc2NvcmUsXG4gICAgczogYXZnc3BlZWQsXG4gICAgeDogcG9zaXRpb24sXG4gICAgeTogc3RhdGUubWF4UG9zaXRpb255LFxuICAgIHkyOiBzdGF0ZS5taW5Qb3NpdGlvbnlcbiAgfVxufVxuIiwidmFyIHNjYXR0ZXJQbG90ID0gcmVxdWlyZShcIi4vc2NhdHRlci1wbG90XCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGxvdEdyYXBoczogZnVuY3Rpb24oZ3JhcGhFbGVtLCB0b3BTY29yZXNFbGVtLCBzY2F0dGVyUGxvdEVsZW0sIGxhc3RTdGF0ZSwgc2NvcmVzLCBjb25maWcpIHtcbiAgICBsYXN0U3RhdGUgPSBsYXN0U3RhdGUgfHwge307XG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aFxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xuICAgIHZhciBuZXh0U3RhdGUgPSBjd19zdG9yZUdyYXBoU2NvcmVzKFxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXG4gICAgKTtcbiAgICAvLyBEZWJ1ZzogY29uc29sZS5sb2coc2NvcmVzLCBuZXh0U3RhdGUpO1xuICAgIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCk7XG4gICAgY3dfcGxvdEF2ZXJhZ2UobmV4dFN0YXRlLCBncmFwaGN0eCk7XG4gICAgY3dfcGxvdEVsaXRlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xuICAgIGN3X3Bsb3RUb3AobmV4dFN0YXRlLCBncmFwaGN0eCk7XG4gICAgY3dfbGlzdFRvcFNjb3Jlcyh0b3BTY29yZXNFbGVtLCBuZXh0U3RhdGUpO1xuICAgIG5leHRTdGF0ZS5zY2F0dGVyR3JhcGggPSBkcmF3QWxsUmVzdWx0cyhcbiAgICAgIHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBuZXh0U3RhdGUsIGxhc3RTdGF0ZS5zY2F0dGVyR3JhcGhcbiAgICApO1xuICAgIHJldHVybiBuZXh0U3RhdGU7XG4gIH0sXG4gIGNsZWFyR3JhcGhpY3M6IGZ1bmN0aW9uKGdyYXBoRWxlbSkge1xuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xuICAgIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCk7XG4gIH1cbn07XG5cblxuZnVuY3Rpb24gY3dfc3RvcmVHcmFwaFNjb3JlcyhsYXN0U3RhdGUsIGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcbiAgLy8gRGVidWc6IGNvbnNvbGUubG9nKGN3X2NhclNjb3Jlcyk7XG4gIFxuICAvLyBTdG9yZSB0aGUgdG9wIGNhcidzIGNvbXBsZXRlIGRhdGEgaW5jbHVkaW5nIGdlbm9tZVxuICB2YXIgdG9wQ2FyRGF0YSA9IHtcbiAgICBzY29yZTogY3dfY2FyU2NvcmVzWzBdLnNjb3JlLFxuICAgIGRlZjogY3dfY2FyU2NvcmVzWzBdLmRlZiwgIC8vIENvbXBsZXRlIGNhciBkZWZpbml0aW9uIHdpdGggZ2Vub21lXG4gICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gIH07XG4gIFxuICByZXR1cm4ge1xuICAgIGN3X3RvcFNjb3JlczogKGxhc3RTdGF0ZS5jd190b3BTY29yZXMgfHwgW10pXG4gICAgLmNvbmNhdChbY3dfY2FyU2NvcmVzWzBdLnNjb3JlXSksXG4gICAgY3dfdG9wQ2Fyc1dpdGhHZW5vbWU6IChsYXN0U3RhdGUuY3dfdG9wQ2Fyc1dpdGhHZW5vbWUgfHwgW10pXG4gICAgLmNvbmNhdChbdG9wQ2FyRGF0YV0pLFxuICAgIGN3X2dyYXBoQXZlcmFnZTogKGxhc3RTdGF0ZS5jd19ncmFwaEF2ZXJhZ2UgfHwgW10pLmNvbmNhdChbXG4gICAgICBjd19hdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXG4gICAgXSksXG4gICAgY3dfZ3JhcGhFbGl0ZTogKGxhc3RTdGF0ZS5jd19ncmFwaEVsaXRlIHx8IFtdKS5jb25jYXQoW1xuICAgICAgY3dfZWxpdGVhdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXG4gICAgXSksXG4gICAgY3dfZ3JhcGhUb3A6IChsYXN0U3RhdGUuY3dfZ3JhcGhUb3AgfHwgW10pLmNvbmNhdChbXG4gICAgICBjd19jYXJTY29yZXNbMF0uc2NvcmUudlxuICAgIF0pLFxuICAgIGFsbFJlc3VsdHM6IChsYXN0U3RhdGUuYWxsUmVzdWx0cyB8fCBbXSkuY29uY2F0KGN3X2NhclNjb3JlcyksXG4gIH1cbn1cblxuZnVuY3Rpb24gY3dfcGxvdFRvcChzdGF0ZSwgZ3JhcGhjdHgpIHtcbiAgdmFyIGN3X2dyYXBoVG9wID0gc3RhdGUuY3dfZ3JhcGhUb3A7XG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaFRvcC5sZW5ndGg7XG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjQzgzQjNCXCI7XG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhUb3Bba10pO1xuICB9XG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xufVxuXG5mdW5jdGlvbiBjd19wbG90RWxpdGUoc3RhdGUsIGdyYXBoY3R4KSB7XG4gIHZhciBjd19ncmFwaEVsaXRlID0gc3RhdGUuY3dfZ3JhcGhFbGl0ZTtcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoRWxpdGUubGVuZ3RoO1xuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzdCQzc0RFwiO1xuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoRWxpdGVba10pO1xuICB9XG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xufVxuXG5mdW5jdGlvbiBjd19wbG90QXZlcmFnZShzdGF0ZSwgZ3JhcGhjdHgpIHtcbiAgdmFyIGN3X2dyYXBoQXZlcmFnZSA9IHN0YXRlLmN3X2dyYXBoQXZlcmFnZTtcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoQXZlcmFnZS5sZW5ndGg7XG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhBdmVyYWdlW2tdKTtcbiAgfVxuICBncmFwaGN0eC5zdHJva2UoKTtcbn1cblxuXG5mdW5jdGlvbiBjd19lbGl0ZWF2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICB2YXIgc3VtID0gMDtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7IGsrKykge1xuICAgIHN1bSArPSBzY29yZXNba10uc2NvcmUudjtcbiAgfVxuICByZXR1cm4gc3VtIC8gTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpO1xufVxuXG5mdW5jdGlvbiBjd19hdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcbiAgdmFyIHN1bSA9IDA7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xuICAgIHN1bSArPSBzY29yZXNba10uc2NvcmUudjtcbiAgfVxuICByZXR1cm4gc3VtIC8gZ2VuZXJhdGlvblNpemU7XG59XG5cbmZ1bmN0aW9uIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCkge1xuICBncmFwaGNhbnZhcy53aWR0aCA9IGdyYXBoY2FudmFzLndpZHRoO1xuICBncmFwaGN0eC50cmFuc2xhdGUoMCwgZ3JhcGhoZWlnaHQpO1xuICBncmFwaGN0eC5zY2FsZSgxLCAtMSk7XG4gIGdyYXBoY3R4LmxpbmVXaWR0aCA9IDE7XG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyAyKTtcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0IC8gMik7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDQpO1xuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyA0KTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0ICogMyAvIDQpO1xuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xufVxuXG5mdW5jdGlvbiBjd19saXN0VG9wU2NvcmVzKGVsZW0sIHN0YXRlKSB7XG4gIHZhciBjd190b3BTY29yZXMgPSBzdGF0ZS5jd190b3BTY29yZXM7XG4gIHZhciBjd190b3BDYXJzV2l0aEdlbm9tZSA9IHN0YXRlLmN3X3RvcENhcnNXaXRoR2Vub21lIHx8IFtdO1xuICB2YXIgdHMgPSBlbGVtO1xuICB0cy5pbm5lckhUTUwgPSBcIjxiPlRvcCBTY29yZXM6PC9iPjxiciAvPlwiO1xuICBcbiAgLy8gQ3JlYXRlIHBhaXJzIG9mIHNjb3JlcyBhbmQgZ2Vub21lIGRhdGEsIHNvcnRlZCBieSBzY29yZVxuICB2YXIgdG9wU2NvcmVzV2l0aEdlbm9tZSA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGN3X3RvcFNjb3Jlcy5sZW5ndGggJiYgaSA8IGN3X3RvcENhcnNXaXRoR2Vub21lLmxlbmd0aDsgaSsrKSB7XG4gICAgdG9wU2NvcmVzV2l0aEdlbm9tZS5wdXNoKHtcbiAgICAgIHNjb3JlOiBjd190b3BTY29yZXNbaV0sXG4gICAgICBnZW5vbWU6IGN3X3RvcENhcnNXaXRoR2Vub21lW2ldXG4gICAgfSk7XG4gIH1cbiAgXG4gIC8vIFNvcnQgYnkgc2NvcmUgdmFsdWUgZGVzY2VuZGluZ1xuICB0b3BTY29yZXNXaXRoR2Vub21lLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoYS5zY29yZS52ID4gYi5zY29yZS52KSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDFcbiAgICB9XG4gIH0pO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5taW4oMTAsIHRvcFNjb3Jlc1dpdGhHZW5vbWUubGVuZ3RoKTsgaysrKSB7XG4gICAgdmFyIGVudHJ5ID0gdG9wU2NvcmVzV2l0aEdlbm9tZVtrXTtcbiAgICB2YXIgdG9wU2NvcmUgPSBlbnRyeS5zY29yZTtcbiAgICB2YXIgZ2Vub21lRGF0YSA9IGVudHJ5Lmdlbm9tZTtcbiAgICBcbiAgICB2YXIgbiA9IFwiI1wiICsgKGsgKyAxKSArIFwiOlwiO1xuICAgIHZhciBzY29yZSA9IE1hdGgucm91bmQodG9wU2NvcmUudiAqIDEwMCkgLyAxMDA7XG4gICAgdmFyIGRpc3RhbmNlID0gXCJkOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS54ICogMTAwKSAvIDEwMDtcbiAgICB2YXIgeXJhbmdlID0gIFwiaDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueTIgKiAxMDApIC8gMTAwICsgXCIvXCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnkgKiAxMDApIC8gMTAwICsgXCJtXCI7XG4gICAgdmFyIGdlbiA9IFwiKEdlbiBcIiArIHRvcFNjb3JlLmkgKyBcIilcIjtcbiAgICBcbiAgICAvLyBDcmVhdGUgYSByb3cgd2l0aCBzY29yZSBpbmZvIGFuZCBnZW5vbWUgYnV0dG9uXG4gICAgdmFyIHJvd0RpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgcm93RGl2LmNsYXNzTmFtZSA9IFwidG9wLXNjb3JlLXJvd1wiO1xuICAgIHJvd0Rpdi5zdHlsZS5tYXJnaW5Cb3R0b20gPSBcIjVweFwiO1xuICAgIHJvd0Rpdi5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XG4gICAgcm93RGl2LnN0eWxlLmFsaWduSXRlbXMgPSBcImNlbnRlclwiO1xuICAgIHJvd0Rpdi5zdHlsZS5qdXN0aWZ5Q29udGVudCA9IFwic3BhY2UtYmV0d2VlblwiO1xuICAgIFxuICAgIHZhciBzY29yZVNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcbiAgICBzY29yZVNwYW4uaW5uZXJIVE1MID0gW24sIHNjb3JlLCBkaXN0YW5jZSwgeXJhbmdlLCBnZW5dLmpvaW4oXCIgXCIpO1xuICAgIHNjb3JlU3Bhbi5zdHlsZS5mbGV4ID0gXCIxXCI7XG4gICAgXG4gICAgdmFyIGdlbm9tZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XG4gICAgZ2Vub21lQnV0dG9uLnRleHRDb250ZW50ID0gXCJWaWV3IEdlbm9tZVwiO1xuICAgIGdlbm9tZUJ1dHRvbi5jbGFzc05hbWUgPSBcImdlbm9tZS12aWV3LWJ0blwiO1xuICAgIGdlbm9tZUJ1dHRvbi5zdHlsZS5tYXJnaW5MZWZ0ID0gXCIxMHB4XCI7XG4gICAgZ2Vub21lQnV0dG9uLnN0eWxlLnBhZGRpbmcgPSBcIjJweCA4cHhcIjtcbiAgICBnZW5vbWVCdXR0b24uc3R5bGUuZm9udFNpemUgPSBcIjEycHhcIjtcbiAgICBnZW5vbWVCdXR0b24uc2V0QXR0cmlidXRlKFwiZGF0YS1nZW5vbWUtaW5kZXhcIiwgayk7XG4gICAgXG4gICAgLy8gU3RvcmUgZ2Vub21lIGRhdGEgZm9yIGxhdGVyIGFjY2Vzc1xuICAgIGdlbm9tZUJ1dHRvbi5nZW5vbWVEYXRhID0gZ2Vub21lRGF0YTtcbiAgICBcbiAgICAvLyBBZGQgY2xpY2sgaGFuZGxlclxuICAgIGdlbm9tZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAod2luZG93LnNob3dHZW5vbWVWaWV3KSB7XG4gICAgICAgIHdpbmRvdy5zaG93R2Vub21lVmlldyh0aGlzLmdlbm9tZURhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRmFsbGJhY2sgaWYgZ2Vub21lIHZpZXdlciBub3QgYXZhaWxhYmxlXG4gICAgICAgIGFsZXJ0KFwiR2Vub21lIHZpZXdlciBub3QgeWV0IGluaXRpYWxpemVkLiBQbGVhc2Ugd2FpdCBhIG1vbWVudCBhbmQgdHJ5IGFnYWluLlwiKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICByb3dEaXYuYXBwZW5kQ2hpbGQoc2NvcmVTcGFuKTtcbiAgICByb3dEaXYuYXBwZW5kQ2hpbGQoZ2Vub21lQnV0dG9uKTtcbiAgICB0cy5hcHBlbmRDaGlsZChyb3dEaXYpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKXtcbiAgaWYoIXNjYXR0ZXJQbG90RWxlbSkgcmV0dXJuO1xuICByZXR1cm4gc2NhdHRlclBsb3Qoc2NhdHRlclBsb3RFbGVtLCBhbGxSZXN1bHRzLCBjb25maWcucHJvcGVydHlNYXAsIHByZXZpb3VzR3JhcGgpXG59XG4iLCIvKiBnbG9iYWxzIHZpcyBIaWdoY2hhcnRzICovXG5cbi8vIENhbGxlZCB3aGVuIHRoZSBWaXN1YWxpemF0aW9uIEFQSSBpcyBsb2FkZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gaGlnaENoYXJ0cztcbmZ1bmN0aW9uIGhpZ2hDaGFydHMoZWxlbSwgc2NvcmVzKXtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzY29yZXNbMF0uZGVmKTtcbiAga2V5cyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uKGN1ckFycmF5LCBrZXkpe1xuICAgIHZhciBsID0gc2NvcmVzWzBdLmRlZltrZXldLmxlbmd0aDtcbiAgICB2YXIgc3ViQXJyYXkgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1ckFycmF5LmNvbmNhdChzdWJBcnJheSk7XG4gIH0sIFtdKTtcbiAgZnVuY3Rpb24gcmV0cmlldmVWYWx1ZShvYmosIHBhdGgpe1xuICAgIHJldHVybiBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoZnVuY3Rpb24oY3VyVmFsdWUsIGtleSl7XG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcbiAgICB9LCBvYmopO1xuICB9XG5cbiAgdmFyIGRhdGFPYmogPSBPYmplY3Qua2V5cyhzY29yZXMpLnJlZHVjZShmdW5jdGlvbihrdiwgc2NvcmUpe1xuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAga3Zba2V5XS5kYXRhLnB1c2goW1xuICAgICAgICByZXRyaWV2ZVZhbHVlKHNjb3JlLmRlZiwga2V5KSwgc2NvcmUuc2NvcmUudlxuICAgICAgXSlcbiAgICB9KVxuICAgIHJldHVybiBrdjtcbiAgfSwga2V5cy5yZWR1Y2UoZnVuY3Rpb24oa3YsIGtleSl7XG4gICAga3Zba2V5XSA9IHtcbiAgICAgIG5hbWU6IGtleSxcbiAgICAgIGRhdGE6IFtdLFxuICAgIH1cbiAgICByZXR1cm4ga3Y7XG4gIH0sIHt9KSlcbiAgSGlnaGNoYXJ0cy5jaGFydChlbGVtLmlkLCB7XG4gICAgICBjaGFydDoge1xuICAgICAgICAgIHR5cGU6ICdzY2F0dGVyJyxcbiAgICAgICAgICB6b29tVHlwZTogJ3h5J1xuICAgICAgfSxcbiAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgdGV4dDogJ1Byb3BlcnR5IFZhbHVlIHRvIFNjb3JlJ1xuICAgICAgfSxcbiAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgdGV4dDogJ05vcm1hbGl6ZWQnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGFydE9uVGljazogdHJ1ZSxcbiAgICAgICAgICBlbmRPblRpY2s6IHRydWUsXG4gICAgICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHlBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgdGV4dDogJ1Njb3JlJ1xuICAgICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICBsYXlvdXQ6ICd2ZXJ0aWNhbCcsXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcbiAgICAgICAgICB2ZXJ0aWNhbEFsaWduOiAndG9wJyxcbiAgICAgICAgICB4OiAxMDAsXG4gICAgICAgICAgeTogNzAsXG4gICAgICAgICAgZmxvYXRpbmc6IHRydWUsXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAoSGlnaGNoYXJ0cy50aGVtZSAmJiBIaWdoY2hhcnRzLnRoZW1lLmxlZ2VuZEJhY2tncm91bmRDb2xvcikgfHwgJyNGRkZGRkYnLFxuICAgICAgICAgIGJvcmRlcldpZHRoOiAxXG4gICAgICB9LFxuICAgICAgcGxvdE9wdGlvbnM6IHtcbiAgICAgICAgICBzY2F0dGVyOiB7XG4gICAgICAgICAgICAgIG1hcmtlcjoge1xuICAgICAgICAgICAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICAgICAgICAgICAgc3RhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbG9yOiAncmdiKDEwMCwxMDAsMTAwKSdcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHN0YXRlczoge1xuICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXJrZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgIGhlYWRlckZvcm1hdDogJzxiPntzZXJpZXMubmFtZX08L2I+PGJyPicsXG4gICAgICAgICAgICAgICAgICBwb2ludEZvcm1hdDogJ3twb2ludC54fSwge3BvaW50Lnl9J1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHNlcmllczoga2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcbiAgICAgIH0pXG4gIH0pO1xufVxuXG5mdW5jdGlvbiB2aXNDaGFydChlbGVtLCBzY29yZXMsIHByb3BlcnR5TWFwLCBncmFwaCkge1xuXG4gIC8vIENyZWF0ZSBhbmQgcG9wdWxhdGUgYSBkYXRhIHRhYmxlLlxuICB2YXIgZGF0YSA9IG5ldyB2aXMuRGF0YVNldCgpO1xuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbihzY29yZUluZm8pe1xuICAgIGRhdGEuYWRkKHtcbiAgICAgIHg6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxuICAgICAgejogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcbiAgICAgIHN0eWxlOiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxuICAgIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRQcm9wZXJ0eShpbmZvLCBrZXkpe1xuICAgIGlmKGtleSA9PT0gXCJzY29yZVwiKXtcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnZcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGluZm8uZGVmW2tleV07XG4gICAgfVxuICB9XG5cbiAgLy8gc3BlY2lmeSBvcHRpb25zXG4gIHZhciBvcHRpb25zID0ge1xuICAgIHdpZHRoOiAgJzYwMHB4JyxcbiAgICBoZWlnaHQ6ICc2MDBweCcsXG4gICAgc3R5bGU6ICdkb3Qtc2l6ZScsXG4gICAgc2hvd1BlcnNwZWN0aXZlOiB0cnVlLFxuICAgIHNob3dMZWdlbmQ6IHRydWUsXG4gICAgc2hvd0dyaWQ6IHRydWUsXG4gICAgc2hvd1NoYWRvdzogZmFsc2UsXG5cbiAgICAvLyBPcHRpb24gdG9vbHRpcCBjYW4gYmUgdHJ1ZSwgZmFsc2UsIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgc3RyaW5nIHdpdGggSFRNTCBjb250ZW50c1xuICAgIHRvb2x0aXA6IGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcbiAgICAgIC8vIGRhdGEgaXMgdGhlIG9yaWdpbmFsIG9iamVjdCBwYXNzZWQgdG8gdGhlIHBvaW50IGNvbnN0cnVjdG9yXG4gICAgICByZXR1cm4gJ3Njb3JlOiA8Yj4nICsgcG9pbnQueiArICc8L2I+PGJyPic7IC8vICsgcG9pbnQuZGF0YS5leHRyYTtcbiAgICB9LFxuXG4gICAgLy8gVG9vbHRpcCBkZWZhdWx0IHN0eWxpbmcgY2FuIGJlIG92ZXJyaWRkZW5cbiAgICB0b29sdGlwU3R5bGU6IHtcbiAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgYmFja2dyb3VuZCAgICA6ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNyknLFxuICAgICAgICBwYWRkaW5nICAgICAgIDogJzEwcHgnLFxuICAgICAgICBib3JkZXJSYWRpdXMgIDogJzEwcHgnXG4gICAgICB9LFxuICAgICAgbGluZToge1xuICAgICAgICBib3JkZXJMZWZ0ICAgIDogJzFweCBkb3R0ZWQgcmdiYSgwLCAwLCAwLCAwLjUpJ1xuICAgICAgfSxcbiAgICAgIGRvdDoge1xuICAgICAgICBib3JkZXIgICAgICAgIDogJzVweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSknXG4gICAgICB9XG4gICAgfSxcblxuICAgIGtlZXBBc3BlY3RSYXRpbzogdHJ1ZSxcbiAgICB2ZXJ0aWNhbFJhdGlvOiAwLjVcbiAgfTtcblxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcblxuICAvLyBjcmVhdGUgb3VyIGdyYXBoXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xuICBncmFwaCA9IG5ldyB2aXMuR3JhcGgzZChjb250YWluZXIsIGRhdGEsIG9wdGlvbnMpO1xuXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXG4gIHJldHVybiBncmFwaDtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBnZW5lcmF0ZVJhbmRvbTtcbmZ1bmN0aW9uIGdlbmVyYXRlUmFuZG9tKCl7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xufVxuIiwiLy8gaHR0cDovL3N1bm1pbmd0YW8uYmxvZ3Nwb3QuY29tLzIwMTYvMTEvaW5icmVlZGluZy1jb2VmZmljaWVudC5odG1sXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcblxuZnVuY3Rpb24gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKXtcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcbiAgdmFyIGZsYWdnZWQgPSBuZXcgU2V0KCk7XG4gIHZhciBjb252ZXJnZW5jZVBvaW50cyA9IG5ldyBTZXQoKTtcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcblxuICB2YXIgc3RvcmVkQ29lZmZpY2llbnRzID0gbmV3IE1hcCgpO1xuXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnZlcmdlbmNlUG9pbnRzLnZhbHVlcygpKS5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgdmFyIGlDbyA9IGdldENvZWZmaWNpZW50KHBvaW50KTtcbiAgICByZXR1cm4gc3VtICsgaUNvO1xuICB9LCAwKTtcblxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSl7XG4gICAgdmFyIGl0ZW1zSW5RdWV1ZSA9IFt7IG5vZGU6IGluaXROb2RlLCBwYXRoOiBbXSB9XTtcbiAgICBkb3tcbiAgICAgIHZhciBpdGVtID0gaXRlbXNJblF1ZXVlLnNoaWZ0KCk7XG4gICAgICB2YXIgbm9kZSA9IGl0ZW0ubm9kZTtcbiAgICAgIHZhciBwYXRoID0gaXRlbS5wYXRoO1xuICAgICAgaWYocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpe1xuICAgICAgICB2YXIgbmV4dFBhdGggPSBbIG5vZGUuaWQgXS5jb25jYXQocGF0aCk7XG4gICAgICAgIGl0ZW1zSW5RdWV1ZSA9IGl0ZW1zSW5RdWV1ZS5jb25jYXQobm9kZS5hbmNlc3RyeS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbm9kZTogcGFyZW50LFxuICAgICAgICAgICAgcGF0aDogbmV4dFBhdGhcbiAgICAgICAgICB9O1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfXdoaWxlKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xuXG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKXtcbiAgICAgIHZhciBuZXdBbmNlc3RvciA9ICFuYW1lSW5kZXguaGFzKG5vZGUuaWQpO1xuICAgICAgaWYobmV3QW5jZXN0b3Ipe1xuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcbiAgICAgICAgICBwYXJlbnRzOiAobm9kZS5hbmNlc3RyeSB8fCBbXSkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50LmlkO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgICAgICBjb252ZXJnZW5jZXM6IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgZmxhZ2dlZC5hZGQobm9kZS5pZClcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkSWRlbnRpZmllcil7XG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xuICAgICAgICAgIGlmKCFvZmZzZXRzKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNoaWxkSUQgPSBwYXRoW29mZnNldHNbMV1dO1xuICAgICAgICAgIGNvbnZlcmdlbmNlUG9pbnRzLmFkZChjaGlsZElEKTtcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcbiAgICAgICAgICAgIHBhcmVudDogbm9kZS5pZCxcbiAgICAgICAgICAgIG9mZnNldHM6IG9mZnNldHMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCl7XG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4ucHVzaCh7XG4gICAgICAgICAgY2hpbGQ6IHBhdGhbMF0sXG4gICAgICAgICAgcGF0aDogcGF0aFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYoIW5ld0FuY2VzdG9yKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYoIW5vZGUuYW5jZXN0cnkpe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCl7XG4gICAgaWYoc3RvcmVkQ29lZmZpY2llbnRzLmhhcyhpZCkpe1xuICAgICAgcmV0dXJuIHN0b3JlZENvZWZmaWNpZW50cy5nZXQoaWQpO1xuICAgIH1cbiAgICB2YXIgbm9kZSA9IG5hbWVJbmRleC5nZXQoaWQpO1xuICAgIHZhciB2YWwgPSBub2RlLmNvbnZlcmdlbmNlcy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgICByZXR1cm4gc3VtICsgTWF0aC5wb3coMSAvIDIsIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgdmFsdWUpe1xuICAgICAgICByZXR1cm4gc3VtICsgdmFsdWU7XG4gICAgICB9LCAxKSkgKiAoMSArIGdldENvZWZmaWNpZW50KHBvaW50LnBhcmVudCkpO1xuICAgIH0sIDApO1xuICAgIHN0b3JlZENvZWZmaWNpZW50cy5zZXQoaWQsIHZhbCk7XG5cbiAgICByZXR1cm4gdmFsO1xuXG4gIH1cbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qil7XG4gICAgdmFyIGNpLCBjaiwgbGksIGxqO1xuICAgIG91dGVybG9vcDpcbiAgICBmb3IoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKyl7XG4gICAgICBmb3IoY2ogPSAwLCBsaiA9IGxpc3RCLmxlbmd0aDsgY2ogPCBsajsgY2orKyl7XG4gICAgICAgIGlmKGxpc3RBW2NpXSA9PT0gbGlzdEJbY2pdKXtcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoY2kgPT09IGxpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIFtjaSwgY2pdO1xuICB9XG59XG4iLCJ2YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xuXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xuXG52YXIgc2NoZW1hID0gY2FyQ29uc3RydWN0LmdlbmVyYXRlU2NoZW1hKGNhckNvbnN0YW50cyk7XG52YXIgcGlja1BhcmVudCA9IHJlcXVpcmUoXCIuL3BpY2tQYXJlbnRcIik7XG52YXIgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSByZXF1aXJlKFwiLi9zZWxlY3RGcm9tQWxsUGFyZW50c1wiKTtcbmNvbnN0IGNvbnN0YW50cyA9IHtcbiAgZ2VuZXJhdGlvblNpemU6IDIwLFxuICBzY2hlbWE6IHNjaGVtYSxcbiAgY2hhbXBpb25MZW5ndGg6IDEsXG4gIG11dGF0aW9uX3JhbmdlOiAxLFxuICBnZW5fbXV0YXRpb246IDAuMDUsXG59O1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgY3VycmVudENob2ljZXMgPSBuZXcgTWFwKCk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgIHt9LFxuICAgIGNvbnN0YW50cyxcbiAgICB7XG4gICAgICBzZWxlY3RGcm9tQWxsUGFyZW50czogc2VsZWN0RnJvbUFsbFBhcmVudHMsXG4gICAgICBnZW5lcmF0ZVJhbmRvbTogcmVxdWlyZShcIi4vZ2VuZXJhdGVSYW5kb21cIiksXG4gICAgICBwaWNrUGFyZW50OiBwaWNrUGFyZW50LmJpbmQodm9pZCAwLCBjdXJyZW50Q2hvaWNlcyksXG4gICAgfVxuICApO1xufVxubW9kdWxlLmV4cG9ydHMuY29uc3RhbnRzID0gY29uc3RhbnRzXG4iLCJ2YXIgbkF0dHJpYnV0ZXMgPSAxNTtcbm1vZHVsZS5leHBvcnRzID0gcGlja1BhcmVudDtcblxuZnVuY3Rpb24gcGlja1BhcmVudChjdXJyZW50Q2hvaWNlcywgY2hvb3NlSWQsIGtleSAvKiAsIHBhcmVudHMgKi8pe1xuICBpZighY3VycmVudENob2ljZXMuaGFzKGNob29zZUlkKSl7XG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKVxuICB9XG4gIC8vIGNvbnNvbGUubG9nKGNob29zZUlkKTtcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcbiAgLy8gY29uc29sZS5sb2coc3RhdGUuY3VycGFyZW50KTtcbiAgc3RhdGUuaSsrXG4gIGlmKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpe1xuICAgIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XG4gICAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcbiAgfVxuICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xuICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xuXG4gIGZ1bmN0aW9uIGN3X2Nob29zZVBhcmVudChzdGF0ZSkge1xuICAgIHZhciBjdXJwYXJlbnQgPSBzdGF0ZS5jdXJwYXJlbnQ7XG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcbiAgICB2YXIgc3dhcFBvaW50MSA9IHN0YXRlLnN3YXBQb2ludDFcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN0YXRlLnN3YXBQb2ludDJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcbiAgICBpZiAoKHN3YXBQb2ludDEgPT0gYXR0cmlidXRlSW5kZXgpIHx8IChzd2FwUG9pbnQyID09IGF0dHJpYnV0ZUluZGV4KSkge1xuICAgICAgcmV0dXJuIGN1cnBhcmVudCA9PSAxID8gMCA6IDFcbiAgICB9XG4gICAgcmV0dXJuIGN1cnBhcmVudFxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVBpY2soKXtcbiAgICB2YXIgY3VycGFyZW50ID0gMDtcblxuICAgIHZhciBzd2FwUG9pbnQxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG5BdHRyaWJ1dGVzKSk7XG4gICAgdmFyIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcbiAgICAgIHN3YXBQb2ludDIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcbiAgICB9XG4gICAgdmFyIGkgPSAwO1xuICAgIHJldHVybiB7XG4gICAgICBjdXJwYXJlbnQ6IGN1cnBhcmVudCxcbiAgICAgIGk6IGksXG4gICAgICBzd2FwUG9pbnQxOiBzd2FwUG9pbnQxLFxuICAgICAgc3dhcFBvaW50Mjogc3dhcFBvaW50MlxuICAgIH1cbiAgfVxufVxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gc2ltcGxlU2VsZWN0O1xuXG5mdW5jdGlvbiBzaW1wbGVTZWxlY3QocGFyZW50cyl7XG4gIHZhciB0b3RhbFBhcmVudHMgPSBwYXJlbnRzLmxlbmd0aFxuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XG4gIGlmIChyID09IDApXG4gICAgcmV0dXJuIDA7XG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcbiAgdmFyIHByZXZpb3VzUGFyZW50ID0gcGFyZW50c1twcmV2aW91c1BhcmVudEluZGV4XTtcbiAgdmFyIHZhbGlkUGFyZW50cyA9IHBhcmVudHMuZmlsdGVyKGZ1bmN0aW9uKHBhcmVudCwgaSl7XG4gICAgaWYocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmKCFwcmV2aW91c1BhcmVudCl7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGNoaWxkID0ge1xuICAgICAgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpLFxuICAgICAgYW5jZXN0cnk6IFtwcmV2aW91c1BhcmVudCwgcGFyZW50XS5tYXAoZnVuY3Rpb24ocCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IHAuZGVmLmlkLFxuICAgICAgICAgIGFuY2VzdHJ5OiBwLmRlZi5hbmNlc3RyeVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcbiAgICAvLyBEZWJ1ZzogY29uc29sZS5sb2coXCJpbmJyZWVkaW5nIGNvZWZmaWNpZW50XCIsIGlDbylcbiAgICBpZihpQ28gPiAwLjI1KXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pXG4gIGlmKHZhbGlkUGFyZW50cy5sZW5ndGggPT09IDApe1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwYXJlbnRzLmxlbmd0aClcbiAgfVxuICB2YXIgdG90YWxTY29yZSA9IHZhbGlkUGFyZW50cy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwYXJlbnQpe1xuICAgIHJldHVybiBzdW0gKyBwYXJlbnQuc2NvcmUudjtcbiAgfSwgMCk7XG4gIHZhciByID0gdG90YWxTY29yZSAqIE1hdGgucmFuZG9tKCk7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCB2YWxpZFBhcmVudHMubGVuZ3RoOyBpKyspe1xuICAgIHZhciBzY29yZSA9IHZhbGlkUGFyZW50c1tpXS5zY29yZS52O1xuICAgIGlmKHIgPiBzY29yZSl7XG4gICAgICByID0gciAtIHNjb3JlO1xuICAgIH0gZWxzZSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGk7XG59XG4iLCJ2YXIgbG9nZ2VyID0ge1xuICBpbml0OiBpbml0LFxuICBsb2c6IGxvZyxcbiAgdGltZTogdGltZSxcbiAgdGltZUVuZDogdGltZUVuZCxcbiAgc2V0TGV2ZWw6IHNldExldmVsLFxuICBmcmFtZVN0YXJ0OiBmcmFtZVN0YXJ0LFxuICBmcmFtZUVuZDogZnJhbWVFbmQsXG4gIGdldFN0YXRzOiBnZXRTdGF0cyxcbiAgbG9nSGlzdG9yeVN0cmluZzogbG9nSGlzdG9yeVN0cmluZ1xufTtcblxuLy8gRXhwb3NlIGxvZ2dlciBnbG9iYWxseSBmb3IgY29uc29sZSBhY2Nlc3NcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICB3aW5kb3cuZ2FtZUxvZ2dlciA9IGxvZ2dlcjtcbiAgd2luZG93LmdldEdhbWVMb2dzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXRzOiBnZXRTdGF0cygpLFxuICAgICAgbG9nTGV2ZWxzOiBMT0dfTEVWRUxTLFxuICAgICAgY3VycmVudExldmVsOiBjdXJyZW50TGV2ZWwsXG4gICAgICByZWNlbnRGcmFtZVRpbWVzOiBmcmFtZVRpbWVzLnNsaWNlKC0xMCksXG4gICAgICBsb2dIaXN0b3J5OiBsb2dIaXN0b3J5LnNsaWNlKC0yMCksIC8vIExhc3QgMjAgbG9nIG1lc3NhZ2VzXG4gICAgICB3YXRlckxvZ3M6IGxvZ0hpc3RvcnkuZmlsdGVyKGxvZyA9PiBsb2cubWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd3YXRlcicpKSxcbiAgICAgIGNvbGxpc2lvbkxvZ3M6IGxvZ0hpc3RvcnkuZmlsdGVyKGxvZyA9PiBsb2cubWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjb2xsaXNpb24nKSksXG4gICAgICBsb2dIaXN0b3J5U3RyaW5nOiBsb2dIaXN0b3J5U3RyaW5nXG4gICAgfTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsb2dnZXI7XG5cbnZhciBMT0dfTEVWRUxTID0ge1xuICBFUlJPUjogMCxcbiAgV0FSTjogMSxcbiAgSU5GTzogMixcbiAgREVCVUc6IDNcbn07XG5cbnZhciBjdXJyZW50TGV2ZWwgPSBMT0dfTEVWRUxTLklORk87XG52YXIgZnJhbWVDb3VudCA9IDA7XG52YXIgZnJhbWVTdGFydFRpbWUgPSAwO1xudmFyIGZyYW1lVGltZXMgPSBbXTtcbnZhciBtYXhGcmFtZVRpbWVzID0gMTAwOyAvLyBLZWVwIGxhc3QgMTAwIGZyYW1lIHRpbWVzXG52YXIgdGltZXJzID0ge307XG52YXIgbG9nSGlzdG9yeSA9IFtdOyAvLyBTdG9yZSByZWNlbnQgbG9nIG1lc3NhZ2VzXG52YXIgbWF4TG9nSGlzdG9yeSA9IDEwMDsgLy8gS2VlcCBsYXN0IDEwMCBsb2cgbWVzc2FnZXNcbnZhciBzdGF0cyA9IHtcbiAgdG90YWxGcmFtZXM6IDAsXG4gIGF2Z0ZyYW1lVGltZTogMCxcbiAgbGFzdEZyYW1lVGltZTogMCxcbiAgY29sbGlzaW9uRXZlbnRzOiAwLFxuICB3YXRlckZvcmNlQXBwbGljYXRpb25zOiAwLFxuICBjYXJzSW5XYXRlcjogMFxufTtcblxuZnVuY3Rpb24gaW5pdChsZXZlbCkge1xuICBjdXJyZW50TGV2ZWwgPSBsZXZlbCB8fCBMT0dfTEVWRUxTLklORk87XG4gIGZyYW1lQ291bnQgPSAwO1xuICBzdGF0cyA9IHtcbiAgICB0b3RhbEZyYW1lczogMCxcbiAgICBhdmdGcmFtZVRpbWU6IDAsXG4gICAgbGFzdEZyYW1lVGltZTogMCxcbiAgICBjb2xsaXNpb25FdmVudHM6IDAsXG4gICAgd2F0ZXJGb3JjZUFwcGxpY2F0aW9uczogMCxcbiAgICBjYXJzSW5XYXRlcjogMFxuICB9O1xuICBsb2coTE9HX0xFVkVMUy5JTkZPLCBcIkRlYnVnIGxvZ2dlciBpbml0aWFsaXplZCBhdCBsZXZlbDpcIiwgT2JqZWN0LmtleXMoTE9HX0xFVkVMUylbY3VycmVudExldmVsXSk7XG59XG5cbmZ1bmN0aW9uIGxvZyhsZXZlbCwgLi4uYXJncykge1xuICBpZiAobGV2ZWwgPD0gY3VycmVudExldmVsKSB7XG4gICAgdmFyIHByZWZpeCA9IFwiW1wiICsgT2JqZWN0LmtleXMoTE9HX0xFVkVMUylbbGV2ZWxdICsgXCJdIEZyYW1lIFwiICsgZnJhbWVDb3VudCArIFwiOlwiO1xuICAgIHZhciBtZXNzYWdlID0gcHJlZml4ICsgXCIgXCIgKyBhcmdzLmpvaW4oXCIgXCIpO1xuICAgIFxuICAgIC8vIFN0b3JlIGluIGhpc3RvcnlcbiAgICBsb2dIaXN0b3J5LnB1c2goe1xuICAgICAgbGV2ZWw6IGxldmVsLFxuICAgICAgZnJhbWU6IGZyYW1lQ291bnQsXG4gICAgICBtZXNzYWdlOiBhcmdzLmpvaW4oXCIgXCIpLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgfSk7XG4gICAgXG4gICAgLy8gS2VlcCBoaXN0b3J5IHNpemUgbWFuYWdlYWJsZVxuICAgIGlmIChsb2dIaXN0b3J5Lmxlbmd0aCA+IG1heExvZ0hpc3RvcnkpIHtcbiAgICAgIGxvZ0hpc3Rvcnkuc2hpZnQoKTtcbiAgICB9XG4gICAgXG4gICAgY29uc29sZS5sb2cocHJlZml4LCAuLi5hcmdzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0aW1lKGxhYmVsKSB7XG4gIHRpbWVyc1tsYWJlbF0gPSBwZXJmb3JtYW5jZS5ub3coKTtcbn1cblxuZnVuY3Rpb24gdGltZUVuZChsYWJlbCkge1xuICBpZiAodGltZXJzW2xhYmVsXSkge1xuICAgIHZhciBlbGFwc2VkID0gcGVyZm9ybWFuY2Uubm93KCkgLSB0aW1lcnNbbGFiZWxdO1xuICAgIGxvZyhMT0dfTEVWRUxTLkRFQlVHLCBcIlRpbWVyXCIsIGxhYmVsICsgXCI6XCIsIGVsYXBzZWQudG9GaXhlZCgyKSArIFwibXNcIik7XG4gICAgZGVsZXRlIHRpbWVyc1tsYWJlbF07XG4gICAgcmV0dXJuIGVsYXBzZWQ7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIHNldExldmVsKGxldmVsKSB7XG4gIGN1cnJlbnRMZXZlbCA9IGxldmVsO1xuICBsb2coTE9HX0xFVkVMUy5JTkZPLCBcIkRlYnVnIGxldmVsIGNoYW5nZWQgdG86XCIsIE9iamVjdC5rZXlzKExPR19MRVZFTFMpW2xldmVsXSk7XG59XG5cbmZ1bmN0aW9uIGZyYW1lU3RhcnQoKSB7XG4gIGZyYW1lU3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIGZyYW1lQ291bnQrKztcbiAgc3RhdHMudG90YWxGcmFtZXMrKztcbiAgXG4gIC8vIFJlc2V0IHBlci1mcmFtZSBjb3VudGVyc1xuICBzdGF0cy5jb2xsaXNpb25FdmVudHMgPSAwO1xuICBzdGF0cy53YXRlckZvcmNlQXBwbGljYXRpb25zID0gMDtcbn1cblxuZnVuY3Rpb24gZnJhbWVFbmQoKSB7XG4gIGlmIChmcmFtZVN0YXJ0VGltZSA+IDApIHtcbiAgICB2YXIgZnJhbWVUaW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLSBmcmFtZVN0YXJ0VGltZTtcbiAgICBzdGF0cy5sYXN0RnJhbWVUaW1lID0gZnJhbWVUaW1lO1xuICAgIFxuICAgIGZyYW1lVGltZXMucHVzaChmcmFtZVRpbWUpO1xuICAgIGlmIChmcmFtZVRpbWVzLmxlbmd0aCA+IG1heEZyYW1lVGltZXMpIHtcbiAgICAgIGZyYW1lVGltZXMuc2hpZnQoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2FsY3VsYXRlIGF2ZXJhZ2VcbiAgICB2YXIgc3VtID0gZnJhbWVUaW1lcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKTtcbiAgICBzdGF0cy5hdmdGcmFtZVRpbWUgPSBzdW0gLyBmcmFtZVRpbWVzLmxlbmd0aDtcbiAgICBcbiAgICAvLyBMb2cgc2xvdyBmcmFtZXNcbiAgICBpZiAoZnJhbWVUaW1lID4gNTApIHsgLy8gTW9yZSB0aGFuIDUwbXMgPSBsZXNzIHRoYW4gMjBmcHNcbiAgICAgIGxvZyhMT0dfTEVWRUxTLldBUk4sIFwiU2xvdyBmcmFtZSBkZXRlY3RlZDpcIiwgZnJhbWVUaW1lLnRvRml4ZWQoMikgKyBcIm1zXCIpO1xuICAgIH1cbiAgICBcbiAgICAvLyBMb2cgZXZlcnkgNjAgZnJhbWVzXG4gICAgaWYgKGZyYW1lQ291bnQgJSA2MCA9PT0gMCkge1xuICAgICAgbG9nKExPR19MRVZFTFMuREVCVUcsIFwiRnJhbWUgc3RhdHMgLSBBdmc6XCIsIHN0YXRzLmF2Z0ZyYW1lVGltZS50b0ZpeGVkKDIpICsgXCJtc1wiLCBcbiAgICAgICAgICBcIkxhc3Q6XCIsIHN0YXRzLmxhc3RGcmFtZVRpbWUudG9GaXhlZCgyKSArIFwibXNcIiwgXG4gICAgICAgICAgXCJDb2xsaXNpb25zOlwiLCBzdGF0cy5jb2xsaXNpb25FdmVudHMsXG4gICAgICAgICAgXCJXYXRlciBmb3JjZXM6XCIsIHN0YXRzLndhdGVyRm9yY2VBcHBsaWNhdGlvbnMpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRTdGF0cygpIHtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRzKTtcbn1cblxuLy8gR2xvYmFsIHN0YXRzIGluY3JlbWVudGVyc1xuZnVuY3Rpb24gaW5jcmVtZW50Q29sbGlzaW9uRXZlbnRzKCkge1xuICBzdGF0cy5jb2xsaXNpb25FdmVudHMrKztcbn1cblxuZnVuY3Rpb24gaW5jcmVtZW50V2F0ZXJGb3JjZXMoKSB7XG4gIHN0YXRzLndhdGVyRm9yY2VBcHBsaWNhdGlvbnMrKztcbn1cblxuZnVuY3Rpb24gc2V0Q2Fyc0luV2F0ZXIoY291bnQpIHtcbiAgc3RhdHMuY2Fyc0luV2F0ZXIgPSBjb3VudDtcbn1cblxuZnVuY3Rpb24gbG9nSGlzdG9yeVN0cmluZyhsaW5lcykge1xuICB2YXIgbnVtTGluZXMgPSBsaW5lcyB8fCAyMDtcbiAgdmFyIGxvZ3MgPSBsb2dIaXN0b3J5LnNsaWNlKC1udW1MaW5lcyk7XG4gIFxuICBpZiAobG9ncy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gXCJObyBsb2cgbWVzc2FnZXMgYXZhaWxhYmxlLlwiO1xuICB9XG4gIFxuICB2YXIgcmVzdWx0ID0gW107XG4gIHJlc3VsdC5wdXNoKFwiPT09IEdhbWUgTG9nIEhpc3RvcnkgKGxhc3QgXCIgKyBsb2dzLmxlbmd0aCArIFwiIG1lc3NhZ2VzKSA9PT1cIik7XG4gIFxuICBsb2dzLmZvckVhY2goZnVuY3Rpb24obG9nKSB7XG4gICAgdmFyIGxldmVsTmFtZSA9IE9iamVjdC5rZXlzKExPR19MRVZFTFMpW2xvZy5sZXZlbF0gfHwgXCJVTktOT1dOXCI7XG4gICAgdmFyIHRpbWVzdGFtcCA9IG5ldyBEYXRlKGxvZy50aW1lc3RhbXApLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgIHJlc3VsdC5wdXNoKFwiW1wiICsgbGV2ZWxOYW1lICsgXCJdIEZyYW1lIFwiICsgbG9nLmZyYW1lICsgXCIgKFwiICsgdGltZXN0YW1wICsgXCIpOiBcIiArIGxvZy5tZXNzYWdlKTtcbiAgfSk7XG4gIFxuICByZXN1bHQucHVzaChcIj09PSBFbmQgTG9nIEhpc3RvcnkgPT09XCIpO1xuICByZXR1cm4gcmVzdWx0LmpvaW4oXCJcXG5cIik7XG59XG5cbi8vIEV4cG9ydCBzdGF0cyBmdW5jdGlvbnNcbm1vZHVsZS5leHBvcnRzLmluY3JlbWVudENvbGxpc2lvbkV2ZW50cyA9IGluY3JlbWVudENvbGxpc2lvbkV2ZW50cztcbm1vZHVsZS5leHBvcnRzLmluY3JlbWVudFdhdGVyRm9yY2VzID0gaW5jcmVtZW50V2F0ZXJGb3JjZXM7XG5tb2R1bGUuZXhwb3J0cy5zZXRDYXJzSW5XYXRlciA9IHNldENhcnNJbldhdGVyO1xubW9kdWxlLmV4cG9ydHMuTE9HX0xFVkVMUyA9IExPR19MRVZFTFM7IiwidmFyIHJhbmRvbSA9IHJlcXVpcmUoXCIuL3JhbmRvbS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZ2VuZXJhdG9yKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oaW5zdGFuY2UsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5jcmVhdGVOb3JtYWxzKHNjaGVtYVByb3AsIGdlbmVyYXRvcik7XG4gICAgICBpbnN0YW5jZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sIHsgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpIH0pO1xuICB9LFxuICBjcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGFyZW50Q2hvb3Nlcil7XG4gICAgdmFyIGlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzMik7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoaWQsIGtleSwgcGFyZW50cyk7XG4gICAgICAgIHZhbHVlcy5wdXNoKHBhcmVudHNbcF1ba2V5XVtpXSk7XG4gICAgICB9XG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGNyb3NzRGVmO1xuICAgIH0sIHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnRzLm1hcChmdW5jdGlvbihwYXJlbnQpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkOiBwYXJlbnQuaWQsXG4gICAgICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeSxcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgfSk7XG4gIH0sXG4gIGNyZWF0ZU11dGF0ZWRDbG9uZShzY2hlbWEsIGdlbmVyYXRvciwgcGFyZW50LCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XG4gICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLm11dGF0ZU5vcm1hbHMoXG4gICAgICAgIHNjaGVtYVByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGVcbiAgICAgICk7XG4gICAgICBjbG9uZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH0sIHtcbiAgICAgIGlkOiBwYXJlbnQuaWQsXG4gICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5XG4gICAgfSk7XG4gIH0sXG4gIGFwcGx5VHlwZXMoc2NoZW1hLCBwYXJlbnQpe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XG4gICAgICB2YXIgb3JpZ2luYWxWYWx1ZXMgPSBwYXJlbnRba2V5XTtcbiAgICAgIHZhciB2YWx1ZXM7XG4gICAgICBzd2l0Y2goc2NoZW1hUHJvcC50eXBlKXtcbiAgICAgICAgY2FzZSBcInNodWZmbGVcIiA6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvU2h1ZmZsZShzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiZmxvYXRcIiA6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvRmxvYXQoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcbiAgICAgICAgY2FzZSBcImludGVnZXJcIjpcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9JbnRlZ2VyKHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHtzY2hlbWFQcm9wLnR5cGV9IG9mIHNjaGVtYSBmb3Iga2V5ICR7a2V5fWApO1xuICAgICAgfVxuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9LCB7XG4gICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxuICAgIH0pO1xuICB9LFxufVxuIiwidmFyIGNyZWF0ZSA9IHJlcXVpcmUoXCIuLi9jcmVhdGUtaW5zdGFuY2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZW5lcmF0aW9uWmVybzogZ2VuZXJhdGlvblplcm8sXG4gIG5leHRHZW5lcmF0aW9uOiBuZXh0R2VuZXJhdGlvblxufVxuXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybyhjb25maWcpe1xuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBjb25maWcuZ2VuZXJhdGlvblNpemUsXG4gIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7XG4gIHZhciBjd19jYXJHZW5lcmF0aW9uID0gW107XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xuICAgIHZhciBkZWYgPSBjcmVhdGUuY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIE1hdGgucmFuZG9tKClcbiAgICB9KTtcbiAgICBkZWYuaW5kZXggPSBrO1xuICAgIGN3X2NhckdlbmVyYXRpb24ucHVzaChkZWYpO1xuICB9XG4gIHJldHVybiB7XG4gICAgY291bnRlcjogMCxcbiAgICBnZW5lcmF0aW9uOiBjd19jYXJHZW5lcmF0aW9uLFxuICB9O1xufVxuXG5mdW5jdGlvbiBuZXh0R2VuZXJhdGlvbihcbiAgcHJldmlvdXNTdGF0ZSxcbiAgc2NvcmVzLFxuICBjb25maWdcbil7XG4gIHZhciBsb2dnZXIgPSByZXF1aXJlKFwiLi4vLi4vbG9nZ2VyL2xvZ2dlci5qc1wiKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCI9PT0gTkVYVCBHRU5FUkFUSU9OIFNUQVJUSU5HID09PVwiKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJTY2hlbWE6XCIsIEpTT04uc3RyaW5naWZ5KGNvbmZpZy5zY2hlbWEpKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJHZW5lcmF0aW9uIHNpemU6XCIsIGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSk7XG4gIFxuICB2YXIgY2hhbXBpb25fbGVuZ3RoID0gY29uZmlnLmNoYW1waW9uTGVuZ3RoLFxuICAgIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxuICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzID0gY29uZmlnLnNlbGVjdEZyb21BbGxQYXJlbnRzO1xuXG4gIHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XG4gIHZhciBuZXdib3JuO1xuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkFkZGluZ1wiLCBjaGFtcGlvbl9sZW5ndGgsIFwiY2hhbXBpb25zIHRvIG5ldyBnZW5lcmF0aW9uXCIpO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGNoYW1waW9uX2xlbmd0aDsgaysrKSB7YGBcbiAgICBzY29yZXNba10uZGVmLmlzX2VsaXRlID0gdHJ1ZTtcbiAgICBzY29yZXNba10uZGVmLmluZGV4ID0gaztcbiAgICBuZXdHZW5lcmF0aW9uLnB1c2goc2NvcmVzW2tdLmRlZik7XG4gIH1cbiAgdmFyIHBhcmVudExpc3QgPSBbXTtcbiAgZm9yIChrID0gY2hhbXBpb25fbGVuZ3RoOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xuICAgIHZhciBwYXJlbnQxID0gc2VsZWN0RnJvbUFsbFBhcmVudHMoc2NvcmVzLCBwYXJlbnRMaXN0KTtcbiAgICB2YXIgcGFyZW50MiA9IHBhcmVudDE7XG4gICAgd2hpbGUgKHBhcmVudDIgPT0gcGFyZW50MSkge1xuICAgICAgcGFyZW50MiA9IHNlbGVjdEZyb21BbGxQYXJlbnRzKHNjb3JlcywgcGFyZW50TGlzdCwgcGFyZW50MSk7XG4gICAgfVxuICAgIHZhciBwYWlyID0gW3BhcmVudDEsIHBhcmVudDJdXG4gICAgcGFyZW50TGlzdC5wdXNoKHBhaXIpO1xuICAgIG5ld2Jvcm4gPSBtYWtlQ2hpbGQoY29uZmlnLFxuICAgICAgcGFpci5tYXAoZnVuY3Rpb24ocGFyZW50KSB7IHJldHVybiBzY29yZXNbcGFyZW50XS5kZWY7IH0pXG4gICAgKTtcbiAgICBuZXdib3JuID0gbXV0YXRlKGNvbmZpZywgbmV3Ym9ybik7XG4gICAgbmV3Ym9ybi5pc19lbGl0ZSA9IGZhbHNlO1xuICAgIG5ld2Jvcm4uaW5kZXggPSBrO1xuICAgIG5ld0dlbmVyYXRpb24ucHVzaChuZXdib3JuKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY291bnRlcjogcHJldmlvdXNTdGF0ZS5jb3VudGVyICsgMSxcbiAgICBnZW5lcmF0aW9uOiBuZXdHZW5lcmF0aW9uLFxuICB9O1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VDaGlsZChjb25maWcsIHBhcmVudHMpe1xuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcbiAgICBwaWNrUGFyZW50ID0gY29uZmlnLnBpY2tQYXJlbnQ7XG4gIHJldHVybiBjcmVhdGUuY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBpY2tQYXJlbnQpXG59XG5cblxuZnVuY3Rpb24gbXV0YXRlKGNvbmZpZywgcGFyZW50KXtcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXG4gICAgbXV0YXRpb25fcmFuZ2UgPSBjb25maWcubXV0YXRpb25fcmFuZ2UsXG4gICAgZ2VuX211dGF0aW9uID0gY29uZmlnLmdlbl9tdXRhdGlvbixcbiAgICBnZW5lcmF0ZVJhbmRvbSA9IGNvbmZpZy5nZW5lcmF0ZVJhbmRvbTtcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVNdXRhdGVkQ2xvbmUoXG4gICAgc2NoZW1hLFxuICAgIGdlbmVyYXRlUmFuZG9tLFxuICAgIHBhcmVudCxcbiAgICBNYXRoLm1heChtdXRhdGlvbl9yYW5nZSksXG4gICAgZ2VuX211dGF0aW9uXG4gIClcbn1cbiIsIlxuXG5jb25zdCByYW5kb20gPSB7XG4gIHNodWZmbGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGggfHwgMTAsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICB9LCBnZW5lcmF0b3IpKTtcbiAgfSxcbiAgY3JlYXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHZhbHVlcy5wdXNoKFxuICAgICAgICBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSxcbiAgbXV0YXRlU2h1ZmZsZShcbiAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcbiAgKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtdXRhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXG4gICAgKSk7XG4gIH0sXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtYXBUb1NodWZmbGUocHJvcCwgbm9ybWFscyl7XG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XG4gICAgdmFyIGxpbWl0ID0gcHJvcC5saW1pdCB8fCBwcm9wLmxlbmd0aDtcbiAgICBcbiAgICAvLyBTaW1wbGUgYXBwcm9hY2g6IGp1c3QgcmV0dXJuIHRoZSBmaXJzdCAnbGltaXQnIGluZGljZXMgd2l0aCBvZmZzZXRcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW1pdCAmJiBpIDwgcHJvcC5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0LnB1c2goaSArIG9mZnNldCk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG4gIG1hcFRvSW50ZWdlcihwcm9wLCBub3JtYWxzKXtcbiAgICBwcm9wID0ge1xuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMTAsXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoXG4gICAgfVxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKS5tYXAoZnVuY3Rpb24oZmxvYXQpe1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xuICAgIH0pO1xuICB9LFxuICBtYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpe1xuICAgIHByb3AgPSB7XG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxXG4gICAgfVxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbihub3JtYWwpe1xuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xuICAgICAgdmFyIHJhbmdlID0gcHJvcC5yYW5nZTtcbiAgICAgIHJldHVybiBtaW4gKyBub3JtYWwgKiByYW5nZVxuICAgIH0pXG4gIH0sXG4gIG11dGF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2VcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uKG9yaWdpbmFsVmFsdWUpe1xuICAgICAgaWYoZ2VuZXJhdG9yKCkgPiBjaGFuY2VUb011dGF0ZSl7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG11dGF0ZU5vcm1hbChcbiAgICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3JcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xuXG5mdW5jdGlvbiBtdXRhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBtdXRhdGlvbl9yYW5nZSl7XG4gIGlmKG11dGF0aW9uX3JhbmdlID4gMSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG11dGF0ZSBiZXlvbmQgYm91bmRzXCIpO1xuICB9XG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xuICBpZiAobmV3TWluIDwgMCkgbmV3TWluID0gMDtcbiAgaWYgKG5ld01pbiArIG11dGF0aW9uX3JhbmdlICA+IDEpXG4gICAgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xuICB2YXIgcmFuZ2VWYWx1ZSA9IGNyZWF0ZU5vcm1hbCh7XG4gICAgaW5jbHVzaXZlOiB0cnVlLFxuICB9LCBnZW5lcmF0b3IpO1xuICByZXR1cm4gbmV3TWluICsgcmFuZ2VWYWx1ZSAqIG11dGF0aW9uX3JhbmdlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKXtcbiAgaWYoIXByb3AuaW5jbHVzaXZlKXtcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdlbmVyYXRvcigpIDwgMC41ID9cbiAgICBnZW5lcmF0b3IoKSA6XG4gICAgMSAtIGdlbmVyYXRvcigpO1xuICB9XG59XG4iLCJ2YXIgY3JlYXRlID0gcmVxdWlyZShcIi4uL2NyZWF0ZS1pbnN0YW5jZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdlbmVyYXRpb25aZXJvOiBnZW5lcmF0aW9uWmVybyxcbiAgbmV4dEdlbmVyYXRpb246IG5leHRHZW5lcmF0aW9uLFxufVxuXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybyhjb25maWcpe1xuICB2YXIgb2xkU3RydWN0dXJlID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKFxuICAgIGNvbmZpZy5zY2hlbWEsIGNvbmZpZy5nZW5lcmF0ZVJhbmRvbVxuICApO1xuICB2YXIgbmV3U3RydWN0dXJlID0gY3JlYXRlU3RydWN0dXJlKGNvbmZpZywgMSwgb2xkU3RydWN0dXJlKTtcblxuICB2YXIgayA9IDA7XG5cbiAgcmV0dXJuIHtcbiAgICBjb3VudGVyOiAwLFxuICAgIGs6IGssXG4gICAgZ2VuZXJhdGlvbjogW25ld1N0cnVjdHVyZSwgb2xkU3RydWN0dXJlXVxuICB9XG59XG5cbmZ1bmN0aW9uIG5leHRHZW5lcmF0aW9uKHByZXZpb3VzU3RhdGUsIHNjb3JlcywgY29uZmlnKXtcbiAgdmFyIG5leHRTdGF0ZSA9IHtcbiAgICBrOiAocHJldmlvdXNTdGF0ZS5rICsgMSklY29uZmlnLmdlbmVyYXRpb25TaXplLFxuICAgIGNvdW50ZXI6IHByZXZpb3VzU3RhdGUuY291bnRlciArIChwcmV2aW91c1N0YXRlLmsgPT09IGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSA/IDEgOiAwKVxuICB9O1xuICAvLyBncmFkdWFsbHkgZ2V0IGNsb3NlciB0byB6ZXJvIHRlbXBlcmF0dXJlIChidXQgbmV2ZXIgaGl0IGl0KVxuICB2YXIgb2xkRGVmID0gcHJldmlvdXNTdGF0ZS5jdXJEZWYgfHwgcHJldmlvdXNTdGF0ZS5nZW5lcmF0aW9uWzFdO1xuICB2YXIgb2xkU2NvcmUgPSBwcmV2aW91c1N0YXRlLnNjb3JlIHx8IHNjb3Jlc1sxXS5zY29yZS52O1xuXG4gIHZhciBuZXdEZWYgPSBwcmV2aW91c1N0YXRlLmdlbmVyYXRpb25bMF07XG4gIHZhciBuZXdTY29yZSA9IHNjb3Jlc1swXS5zY29yZS52O1xuXG5cbiAgdmFyIHRlbXAgPSBNYXRoLnBvdyhNYXRoLkUsIC1uZXh0U3RhdGUuY291bnRlciAvIGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSk7XG5cbiAgdmFyIHNjb3JlRGlmZiA9IG5ld1Njb3JlIC0gb2xkU2NvcmU7XG4gIC8vIElmIHRoZSBuZXh0IHBvaW50IGlzIGhpZ2hlciwgY2hhbmdlIGxvY2F0aW9uXG4gIGlmKHNjb3JlRGlmZiA+IDApe1xuICAgIG5leHRTdGF0ZS5jdXJEZWYgPSBuZXdEZWY7XG4gICAgbmV4dFN0YXRlLnNjb3JlID0gbmV3U2NvcmU7XG4gICAgLy8gRWxzZSB3ZSB3YW50IHRvIGluY3JlYXNlIGxpa2VseWhvb2Qgb2YgY2hhbmdpbmcgbG9jYXRpb24gYXMgd2UgZ2V0XG4gIH0gZWxzZSBpZihNYXRoLnJhbmRvbSgpID4gTWF0aC5leHAoLXNjb3JlRGlmZi8obmV4dFN0YXRlLmsgKiB0ZW1wKSkpe1xuICAgIG5leHRTdGF0ZS5jdXJEZWYgPSBuZXdEZWY7XG4gICAgbmV4dFN0YXRlLnNjb3JlID0gbmV3U2NvcmU7XG4gIH0gZWxzZSB7XG4gICAgbmV4dFN0YXRlLmN1ckRlZiA9IG9sZERlZjtcbiAgICBuZXh0U3RhdGUuc2NvcmUgPSBvbGRTY29yZTtcbiAgfVxuXG4gIC8vIERlYnVnIGxvZyBmb3Igc2ltdWxhdGVkIGFubmVhbGluZ1xuICAvLyBjb25zb2xlLmxvZyhwcmV2aW91c1N0YXRlLCBuZXh0U3RhdGUpO1xuXG4gIG5leHRTdGF0ZS5nZW5lcmF0aW9uID0gW2NyZWF0ZVN0cnVjdHVyZShjb25maWcsIHRlbXAsIG5leHRTdGF0ZS5jdXJEZWYpXTtcblxuICByZXR1cm4gbmV4dFN0YXRlO1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZVN0cnVjdHVyZShjb25maWcsIG11dGF0aW9uX3JhbmdlLCBwYXJlbnQpe1xuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcbiAgICBnZW5fbXV0YXRpb24gPSAxLFxuICAgIGdlbmVyYXRlUmFuZG9tID0gY29uZmlnLmdlbmVyYXRlUmFuZG9tO1xuICByZXR1cm4gY3JlYXRlLmNyZWF0ZU11dGF0ZWRDbG9uZShcbiAgICBzY2hlbWEsXG4gICAgZ2VuZXJhdGVSYW5kb20sXG4gICAgcGFyZW50LFxuICAgIG11dGF0aW9uX3JhbmdlLFxuICAgIGdlbl9tdXRhdGlvblxuICApXG5cbn1cbiIsIi8qIGdsb2JhbHMgYnRvYSAqL1xudmFyIHNldHVwU2NlbmUgPSByZXF1aXJlKFwiLi9zZXR1cC1zY2VuZVwiKTtcbnZhciBjYXJSdW4gPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9ydW5cIik7XG52YXIgZGVmVG9DYXIgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9kZWYtdG8tY2FyXCIpO1xudmFyIHdhdGVyUGh5c2ljcyA9IHJlcXVpcmUoXCIuL3dhdGVyLXBoeXNpY3NcIik7XG52YXIgbG9nZ2VyID0gcmVxdWlyZShcIi4uL2xvZ2dlci9sb2dnZXJcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gcnVuRGVmcztcbmZ1bmN0aW9uIHJ1bkRlZnMod29ybGRfZGVmLCBkZWZzLCBsaXN0ZW5lcnMpIHtcbiAgLy8gSW5pdGlhbGl6ZSBkZWJ1ZyBsb2dnZXJcbiAgbG9nZ2VyLmluaXQobG9nZ2VyLkxPR19MRVZFTFMuSU5GTyk7XG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiU3RhcnRpbmcgd29ybGQgd2l0aFwiLCBkZWZzLmxlbmd0aCwgXCJjYXJzXCIpO1xuICBcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XG4gICAgLy8gR0hPU1QgRElTQUJMRURcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XG4gIH1cblxuICB2YXIgc2NlbmUgPSBzZXR1cFNjZW5lKHdvcmxkX2RlZik7XG4gIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMTUsIDE1KTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJhYm91dCB0byBidWlsZCBjYXJzXCIpO1xuICBcbiAgLy8gTG9nIHdoZWVsIGNvdW50IGZyb20gZmlyc3QgY2FyIGRlZmluaXRpb25cbiAgaWYgKGRlZnMubGVuZ3RoID4gMCAmJiBkZWZzWzBdLndoZWVsX3JhZGl1cykge1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQnVpbGRpbmcgZ2VuZXJhdGlvbiB3aXRoXCIsIGRlZnNbMF0ud2hlZWxfcmFkaXVzLmxlbmd0aCwgXCJ3aGVlbHMgcGVyIGNhclwiKTtcbiAgfVxuICBcbiAgdmFyIGNhcnMgPSBkZWZzLm1hcCgoZGVmLCBpKSA9PiB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJCdWlsZGluZyBjYXJcIiwgaSwgXCJ3aXRoXCIsIGRlZi53aGVlbF9yYWRpdXMgPyBkZWYud2hlZWxfcmFkaXVzLmxlbmd0aCA6IFwidW5rbm93blwiLCBcIndoZWVsc1wiKTtcbiAgICB0cnkge1xuICAgICAgdmFyIGNhck9iaiA9IGRlZlRvQ2FyKGRlZiwgc2NlbmUud29ybGQsIHdvcmxkX2RlZik7XG4gICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBpLCBcImJ1aWx0IHN1Y2Nlc3NmdWxseVwiKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGluZGV4OiBpLFxuICAgICAgICBkZWY6IGRlZixcbiAgICAgICAgY2FyOiBjYXJPYmosXG4gICAgICAgIHN0YXRlOiBjYXJSdW4uZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZilcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5FUlJPUiwgXCJFcnJvciBidWlsZGluZyBjYXJcIiwgaSwgXCI6XCIsIGUubWVzc2FnZSk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfSk7XG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQWxsIGNhcnMgYnVpbHQgc3VjY2Vzc2Z1bGx5XCIpO1xuICB2YXIgYWxpdmVjYXJzID0gY2FycztcbiAgXG4gIC8vIEZ1bmN0aW9uIHRvIGZpbmQgY2FyIGluZm8gZnJvbSBib2R5IChoYW5kbGVzIGR5bmFtaWMgd2hlZWwgY291bnRzKVxuICBmdW5jdGlvbiBmaW5kQ2FyRnJvbUJvZHkoY2FyQm9keSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2Fycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNhciA9IGNhcnNbaV07XG4gICAgICBpZiAoIWNhciB8fCAhY2FyLmNhcikgY29udGludWU7XG4gICAgICBcbiAgICAgIC8vIENoZWNrIGlmIGl0J3MgdGhlIGNoYXNzaXNcbiAgICAgIGlmIChjYXIuY2FyLmNoYXNzaXMgPT09IGNhckJvZHkpIHtcbiAgICAgICAgcmV0dXJuIHtjYXJJbmRleDogY2FyLmluZGV4LCB0eXBlOiAnY2hhc3Npcyd9O1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBDaGVjayBpZiBpdCdzIG9uZSBvZiB0aGUgd2hlZWxzXG4gICAgICBmb3IgKHZhciB3ID0gMDsgdyA8IGNhci5jYXIud2hlZWxzLmxlbmd0aDsgdysrKSB7XG4gICAgICAgIGlmIChjYXIuY2FyLndoZWVsc1t3XSA9PT0gY2FyQm9keSkge1xuICAgICAgICAgIHJldHVybiB7Y2FySW5kZXg6IGNhci5pbmRleCwgdHlwZTogJ3doZWVsJywgd2hlZWxJbmRleDogd307XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgXG4gIC8vIFNldCB1cCBjb2xsaXNpb24gbGlzdGVuZXIgZm9yIHdhdGVyXG4gIHZhciBjb2xsaXNpb25Db3VudCA9IDA7XG4gIHZhciBtYXhDb2xsaXNpb25zUGVyRnJhbWUgPSAxMDAwMDsgLy8gU2FmZXR5IGxpbWl0IC0gZnVydGhlciBpbmNyZWFzZWQgZm9yIDMrIHdoZWVsc1xuICBcbiAgdmFyIGxpc3RlbmVyID0ge1xuICAgIEJlZ2luQ29udGFjdDogZnVuY3Rpb24oY29udGFjdCkge1xuICAgICAgdmFyIGZpeHR1cmVBID0gY29udGFjdC5HZXRGaXh0dXJlQSgpO1xuICAgICAgdmFyIGZpeHR1cmVCID0gY29udGFjdC5HZXRGaXh0dXJlQigpO1xuICAgICAgXG4gICAgICAvLyBFYXJseSBleGl0IGlmIG5laXRoZXIgZml4dHVyZSBpcyB3YXRlclxuICAgICAgdmFyIHVzZXJEYXRhQSA9IGZpeHR1cmVBLkdldFVzZXJEYXRhKCk7XG4gICAgICB2YXIgdXNlckRhdGFCID0gZml4dHVyZUIuR2V0VXNlckRhdGEoKTtcbiAgICAgIFxuICAgICAgaWYgKCghdXNlckRhdGFBIHx8IHVzZXJEYXRhQS50eXBlICE9PSBcIndhdGVyXCIpICYmIFxuICAgICAgICAgICghdXNlckRhdGFCIHx8IHVzZXJEYXRhQi50eXBlICE9PSBcIndhdGVyXCIpKSB7XG4gICAgICAgIHJldHVybjsgLy8gTm90IGEgd2F0ZXIgY29sbGlzaW9uLCBpZ25vcmUgaXRcbiAgICAgIH1cbiAgICAgIFxuICAgICAgbG9nZ2VyLmluY3JlbWVudENvbGxpc2lvbkV2ZW50cygpO1xuICAgICAgY29sbGlzaW9uQ291bnQrKztcbiAgICAgIFxuICAgICAgLy8gU2FmZXR5IGNpcmN1aXQgYnJlYWtlclxuICAgICAgaWYgKGNvbGxpc2lvbkNvdW50ID4gbWF4Q29sbGlzaW9uc1BlckZyYW1lKSB7XG4gICAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuRVJST1IsIFwiVG9vIG1hbnkgY29sbGlzaW9ucyBwZXIgZnJhbWUhIElnbm9yaW5nIGNvbGxpc2lvblwiLCBjb2xsaXNpb25Db3VudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIHdhdGVyRml4dHVyZSA9IG51bGw7XG4gICAgICB2YXIgY2FyRml4dHVyZSA9IG51bGw7XG4gICAgICBcbiAgICAgIGlmIChmaXh0dXJlQS5HZXRVc2VyRGF0YSgpICYmIGZpeHR1cmVBLkdldFVzZXJEYXRhKCkudHlwZSA9PT0gXCJ3YXRlclwiKSB7XG4gICAgICAgIHdhdGVyRml4dHVyZSA9IGZpeHR1cmVBO1xuICAgICAgICBjYXJGaXh0dXJlID0gZml4dHVyZUI7XG4gICAgICB9IGVsc2UgaWYgKGZpeHR1cmVCLkdldFVzZXJEYXRhKCkgJiYgZml4dHVyZUIuR2V0VXNlckRhdGEoKS50eXBlID09PSBcIndhdGVyXCIpIHtcbiAgICAgICAgd2F0ZXJGaXh0dXJlID0gZml4dHVyZUI7XG4gICAgICAgIGNhckZpeHR1cmUgPSBmaXh0dXJlQTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHdhdGVyRml4dHVyZSAmJiBjYXJGaXh0dXJlKSB7XG4gICAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiV2F0ZXIgY29sbGlzaW9uIGRldGVjdGVkXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGR5bmFtaWMgbG9va3VwIHRvIGhhbmRsZSBjaGFuZ2luZyB3aGVlbCBjb3VudHNcbiAgICAgICAgdmFyIGNhckJvZHkgPSBjYXJGaXh0dXJlLkdldEJvZHkoKTtcbiAgICAgICAgdmFyIGNhckluZm8gPSBmaW5kQ2FyRnJvbUJvZHkoY2FyQm9keSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FySW5mbykge1xuICAgICAgICAgIGlmIChjYXJJbmZvLnR5cGUgPT09ICdjaGFzc2lzJykge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySW5mby5jYXJJbmRleCwgXCJjaGFzc2lzIGVudGVyZWQgd2F0ZXJcIik7XG4gICAgICAgICAgICB3YXRlclBoeXNpY3MucmVnaXN0ZXJDYXJQYXJ0SW5XYXRlcihjYXJJbmZvLmNhckluZGV4LCBcImNoYXNzaXNcIiwgd2F0ZXJGaXh0dXJlLkdldFVzZXJEYXRhKCkpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2FySW5mby50eXBlID09PSAnd2hlZWwnKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXJJbmZvLmNhckluZGV4LCBcIndoZWVsXCIsIGNhckluZm8ud2hlZWxJbmRleCwgXCJlbnRlcmVkIHdhdGVyXCIpO1xuICAgICAgICAgICAgd2F0ZXJQaHlzaWNzLnJlZ2lzdGVyQ2FyUGFydEluV2F0ZXIoY2FySW5mby5jYXJJbmRleCwgXCJ3aGVlbFwiICsgY2FySW5mby53aGVlbEluZGV4LCB3YXRlckZpeHR1cmUuR2V0VXNlckRhdGEoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiV2F0ZXIgY29sbGlzaW9uIGJ1dCBjb3VsZG4ndCBmaW5kIGNhciBmb3IgYm9keVwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgRW5kQ29udGFjdDogZnVuY3Rpb24oY29udGFjdCkge1xuICAgICAgdmFyIGZpeHR1cmVBID0gY29udGFjdC5HZXRGaXh0dXJlQSgpO1xuICAgICAgdmFyIGZpeHR1cmVCID0gY29udGFjdC5HZXRGaXh0dXJlQigpO1xuICAgICAgXG4gICAgICAvLyBFYXJseSBleGl0IGlmIG5laXRoZXIgZml4dHVyZSBpcyB3YXRlclxuICAgICAgdmFyIHVzZXJEYXRhQSA9IGZpeHR1cmVBLkdldFVzZXJEYXRhKCk7XG4gICAgICB2YXIgdXNlckRhdGFCID0gZml4dHVyZUIuR2V0VXNlckRhdGEoKTtcbiAgICAgIFxuICAgICAgaWYgKCghdXNlckRhdGFBIHx8IHVzZXJEYXRhQS50eXBlICE9PSBcIndhdGVyXCIpICYmIFxuICAgICAgICAgICghdXNlckRhdGFCIHx8IHVzZXJEYXRhQi50eXBlICE9PSBcIndhdGVyXCIpKSB7XG4gICAgICAgIHJldHVybjsgLy8gTm90IGEgd2F0ZXIgY29sbGlzaW9uLCBpZ25vcmUgaXRcbiAgICAgIH1cbiAgICAgIFxuICAgICAgbG9nZ2VyLmluY3JlbWVudENvbGxpc2lvbkV2ZW50cygpO1xuICAgICAgXG4gICAgICB2YXIgd2F0ZXJGaXh0dXJlID0gbnVsbDtcbiAgICAgIHZhciBjYXJGaXh0dXJlID0gbnVsbDtcbiAgICAgIFxuICAgICAgaWYgKGZpeHR1cmVBLkdldFVzZXJEYXRhKCkgJiYgZml4dHVyZUEuR2V0VXNlckRhdGEoKS50eXBlID09PSBcIndhdGVyXCIpIHtcbiAgICAgICAgd2F0ZXJGaXh0dXJlID0gZml4dHVyZUE7XG4gICAgICAgIGNhckZpeHR1cmUgPSBmaXh0dXJlQjtcbiAgICAgIH0gZWxzZSBpZiAoZml4dHVyZUIuR2V0VXNlckRhdGEoKSAmJiBmaXh0dXJlQi5HZXRVc2VyRGF0YSgpLnR5cGUgPT09IFwid2F0ZXJcIikge1xuICAgICAgICB3YXRlckZpeHR1cmUgPSBmaXh0dXJlQjtcbiAgICAgICAgY2FyRml4dHVyZSA9IGZpeHR1cmVBO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAod2F0ZXJGaXh0dXJlICYmIGNhckZpeHR1cmUpIHtcbiAgICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJXYXRlciBleGl0IGRldGVjdGVkXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGR5bmFtaWMgbG9va3VwIHRvIGhhbmRsZSBjaGFuZ2luZyB3aGVlbCBjb3VudHNcbiAgICAgICAgdmFyIGNhckJvZHkgPSBjYXJGaXh0dXJlLkdldEJvZHkoKTtcbiAgICAgICAgdmFyIGNhckluZm8gPSBmaW5kQ2FyRnJvbUJvZHkoY2FyQm9keSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FySW5mbykge1xuICAgICAgICAgIGlmIChjYXJJbmZvLnR5cGUgPT09ICdjaGFzc2lzJykge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySW5mby5jYXJJbmRleCwgXCJjaGFzc2lzIGV4aXRlZCB3YXRlclwiKTtcbiAgICAgICAgICAgIHdhdGVyUGh5c2ljcy51bnJlZ2lzdGVyQ2FyUGFydEZyb21XYXRlcihjYXJJbmZvLmNhckluZGV4LCBcImNoYXNzaXNcIik7XG4gICAgICAgICAgfSBlbHNlIGlmIChjYXJJbmZvLnR5cGUgPT09ICd3aGVlbCcpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQ2FyXCIsIGNhckluZm8uY2FySW5kZXgsIFwid2hlZWxcIiwgY2FySW5mby53aGVlbEluZGV4LCBcImV4aXRlZCB3YXRlclwiKTtcbiAgICAgICAgICAgIHdhdGVyUGh5c2ljcy51bnJlZ2lzdGVyQ2FyUGFydEZyb21XYXRlcihjYXJJbmZvLmNhckluZGV4LCBcIndoZWVsXCIgKyBjYXJJbmZvLndoZWVsSW5kZXgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIldhdGVyIGV4aXQgYnV0IGNvdWxkbid0IGZpbmQgY2FyIGZvciBib2R5XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBQcmVTb2x2ZTogZnVuY3Rpb24oKSB7fSxcbiAgICBQb3N0U29sdmU6IGZ1bmN0aW9uKCkge31cbiAgfTtcbiAgXG4gIHNjZW5lLndvcmxkLlNldENvbnRhY3RMaXN0ZW5lcihsaXN0ZW5lcik7XG4gIFxuICByZXR1cm4ge1xuICAgIHNjZW5lOiBzY2VuZSxcbiAgICBjYXJzOiBjYXJzLFxuICAgIHN0ZXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxvZ2dlci5mcmFtZVN0YXJ0KCk7XG4gICAgICBsb2dnZXIudGltZShcInRvdGFsLXN0ZXBcIik7XG4gICAgICBjb2xsaXNpb25Db3VudCA9IDA7IC8vIFJlc2V0IGNvbGxpc2lvbiBjb3VudGVyIGVhY2ggZnJhbWVcbiAgICAgIFxuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gbW9yZSBjYXJzXCIpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBBcHBseSB3YXRlciBwaHlzaWNzIEJFRk9SRSBwaHlzaWNzIHN0ZXAgdG8gYXZvaWQgdGltaW5nIGlzc3Vlc1xuICAgICAgbG9nZ2VyLnRpbWUoXCJ3YXRlci1waHlzaWNzXCIpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gQ2xlYXIgZnJhbWUtbGV2ZWwgZXhpdCB0cmFja2luZyBhdCB0aGUgc3RhcnQgb2YgZWFjaCBwaHlzaWNzIHN0ZXBcbiAgICAgICAgd2F0ZXJQaHlzaWNzLmNsZWFyRnJhbWVFeGl0VHJhY2tpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBjYXJzSW5XYXRlciA9IHdhdGVyUGh5c2ljcy5nZXRDYXJzSW5XYXRlcigpO1xuICAgICAgICBsb2dnZXIuc2V0Q2Fyc0luV2F0ZXIoY2Fyc0luV2F0ZXIuc2l6ZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2Fyc0luV2F0ZXIuc2l6ZSA+IDApIHtcbiAgICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkFwcGx5aW5nIHdhdGVyIGZvcmNlcyB0b1wiLCBjYXJzSW5XYXRlci5zaXplLCBcImNhcnNcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNhcnNJbldhdGVyLmZvckVhY2goZnVuY3Rpb24od2F0ZXJEYXRhLCBjYXJJbmRleCkge1xuICAgICAgICAgIHZhciBjYXIgPSBjYXJzW2NhckluZGV4XTtcbiAgICAgICAgICBpZiAoY2FyICYmIGNhci5jYXIgJiYgY2FySW5kZXggPCBjYXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgd2F0ZXJQaHlzaWNzLmFwcGx5V2F0ZXJGb3JjZXMoY2FyLmNhciwgd2F0ZXJEYXRhKTtcbiAgICAgICAgICAgIGxvZ2dlci5pbmNyZW1lbnRXYXRlckZvcmNlcygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDbGVhbiB1cCBpbnZhbGlkIGVudHJpZXNcbiAgICAgICAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiUmVtb3ZpbmcgaW52YWxpZCBjYXJcIiwgY2FySW5kZXgsIFwiZnJvbSB3YXRlciByZWdpc3RyeVwiKTtcbiAgICAgICAgICAgIHdhdGVyUGh5c2ljcy51bnJlZ2lzdGVyQ2FyRnJvbVdhdGVyKGNhckluZGV4KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkVSUk9SLCBcIkVycm9yIGluIHdhdGVyIHBoeXNpY3M6XCIsIGUpO1xuICAgICAgfVxuICAgICAgbG9nZ2VyLnRpbWVFbmQoXCJ3YXRlci1waHlzaWNzXCIpO1xuICAgICAgXG4gICAgICBsb2dnZXIudGltZShcInBoeXNpY3Mtc3RlcFwiKTtcbiAgICAgIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMTUsIDE1KTtcbiAgICAgIGxvZ2dlci50aW1lRW5kKFwicGh5c2ljcy1zdGVwXCIpO1xuICAgICAgXG4gICAgICBsaXN0ZW5lcnMucHJlQ2FyU3RlcCgpO1xuICAgICAgYWxpdmVjYXJzID0gYWxpdmVjYXJzLmZpbHRlcihmdW5jdGlvbiAoY2FyKSB7XG4gICAgICAgIC8vIFBhc3MgY2FyIGluZGV4IHRvIHRoZSBjYXIgZm9yIHdhdGVyIGRldGVjdGlvblxuICAgICAgICBjYXIuY2FyLmNhckluZGV4ID0gY2FyLmluZGV4O1xuICAgICAgICBcbiAgICAgICAgLy8gR0xPQkFMIEZMWUlORyBDQVIgUFJFVkVOVElPTjogQ2hlY2sgYWxsIGNhcnMgZm9yIGV4Y2Vzc2l2ZSB1cHdhcmQgdmVsb2NpdHlcbiAgICAgICAgaWYgKGNhci5jYXIuY2hhc3NpcyAmJiBjYXIuY2FyLmNoYXNzaXMuSXNBY3RpdmUoKSkge1xuICAgICAgICAgIHZhciB2ZWxvY2l0eSA9IGNhci5jYXIuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpO1xuICAgICAgICAgIGlmICh2ZWxvY2l0eSAmJiB2ZWxvY2l0eS55ID4gMS4yKSB7XG4gICAgICAgICAgICAvLyBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLldBUk4sIFwiR0xPQkFMOiBDYXJcIiwgY2FyLmluZGV4LCBcImZseWluZyB3aXRoIHZlbG9jaXR5XCIsIHZlbG9jaXR5LnkudG9GaXhlZCgyKSwgXCItIGFnZ3Jlc3NpdmUgcmVzZXRcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFHR1JFU1NJVkUgUkVTRVQ6IFNldCBkb3dud2FyZCB2ZWxvY2l0eSB0byBicmVhayBmb3JjZSBlcXVpbGlicml1bVxuICAgICAgICAgICAgY2FyLmNhci5jaGFzc2lzLlNldExpbmVhclZlbG9jaXR5KG5ldyBiMlZlYzIodmVsb2NpdHkueCwgLTAuNSkpO1xuICAgICAgICAgICAgY2FyLmNhci5jaGFzc2lzLlNldEFuZ3VsYXJWZWxvY2l0eSgwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWxzbyByZXNldCB3aGVlbHMgdG8gcHJldmVudCBqb2ludCBmb3JjZXNcbiAgICAgICAgICAgIGlmIChjYXIuY2FyLndoZWVscykge1xuICAgICAgICAgICAgICBmb3IgKHZhciB3ID0gMDsgdyA8IGNhci5jYXIud2hlZWxzLmxlbmd0aDsgdysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhci5jYXIud2hlZWxzW3ddICYmIGNhci5jYXIud2hlZWxzW3ddLklzQWN0aXZlKCkpIHtcbiAgICAgICAgICAgICAgICAgIHZhciB3aGVlbFZlbCA9IGNhci5jYXIud2hlZWxzW3ddLkdldExpbmVhclZlbG9jaXR5KCk7XG4gICAgICAgICAgICAgICAgICBjYXIuY2FyLndoZWVsc1t3XS5TZXRMaW5lYXJWZWxvY2l0eShuZXcgYjJWZWMyKHdoZWVsVmVsLngsIC0wLjUpKTtcbiAgICAgICAgICAgICAgICAgIGNhci5jYXIud2hlZWxzW3ddLlNldEFuZ3VsYXJWZWxvY2l0eSgwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yY2UgcmVtb3ZlIGZyb20gYW55IHdhdGVyIHRyYWNraW5nXG4gICAgICAgICAgICB3YXRlclBoeXNpY3MudW5yZWdpc3RlckNhckZyb21XYXRlcihjYXIuaW5kZXgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY2FyLnN0YXRlID0gY2FyUnVuLnVwZGF0ZVN0YXRlKFxuICAgICAgICAgIHdvcmxkX2RlZiwgY2FyLmNhciwgY2FyLnN0YXRlXG4gICAgICAgICk7XG4gICAgICAgIHZhciBzdGF0dXMgPSBjYXJSdW4uZ2V0U3RhdHVzKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcbiAgICAgICAgbGlzdGVuZXJzLmNhclN0ZXAoY2FyKTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNhci5zY29yZSA9IGNhclJ1bi5jYWxjdWxhdGVTY29yZShjYXIuc3RhdGUsIHdvcmxkX2RlZik7XG4gICAgICAgIGxpc3RlbmVycy5jYXJEZWF0aChjYXIpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGNhciBmcm9tIHdhdGVyIHRyYWNraW5nIHdoZW4gaXQgZGllc1xuICAgICAgICB3YXRlclBoeXNpY3MudW5yZWdpc3RlckNhckZyb21XYXRlcihjYXIuaW5kZXgpO1xuXG4gICAgICAgIHZhciB3b3JsZCA9IHNjZW5lLndvcmxkO1xuICAgICAgICB2YXIgd29ybGRDYXIgPSBjYXIuY2FyO1xuICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci5jaGFzc2lzKTtcblxuICAgICAgICBmb3IgKHZhciB3ID0gMDsgdyA8IHdvcmxkQ2FyLndoZWVscy5sZW5ndGg7IHcrKykge1xuICAgICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLndoZWVsc1t3XSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KVxuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbGlzdGVuZXJzLmdlbmVyYXRpb25FbmQoY2Fycyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGxvZ2dlci50aW1lRW5kKFwidG90YWwtc3RlcFwiKTtcbiAgICAgIGxvZ2dlci5mcmFtZUVuZCgpO1xuICAgIH1cbiAgfVxuXG59XG4iLCIvKiBnbG9iYWxzIGIyV29ybGQgYjJWZWMyIGIyQm9keURlZiBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgKi9cblxudmFyIHdhdGVyUGh5c2ljcyA9IHJlcXVpcmUoXCIuL3dhdGVyLXBoeXNpY3NcIik7XG52YXIgbG9nZ2VyID0gcmVxdWlyZShcIi4uL2xvZ2dlci9sb2dnZXJcIik7XG5cbi8qXG5cbndvcmxkX2RlZiA9IHtcbiAgZ3Jhdml0eToge3gsIHl9LFxuICBkb1NsZWVwOiBib29sZWFuLFxuICBmbG9vcnNlZWQ6IHN0cmluZyxcbiAgdGlsZURpbWVuc2lvbnMsXG4gIG1heEZsb29yVGlsZXMsXG4gIG11dGFibGVfZmxvb3I6IGJvb2xlYW4sXG4gIHdhdGVyRW5hYmxlZDogYm9vbGVhblxufVxuXG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHdvcmxkX2RlZil7XG5cbiAgdmFyIHdvcmxkID0gbmV3IGIyV29ybGQod29ybGRfZGVmLmdyYXZpdHksIHdvcmxkX2RlZi5kb1NsZWVwKTtcbiAgXG4gIC8vIENsZWFyIGFueSBleGlzdGluZyB3YXRlciB6b25lc1xuICB3YXRlclBoeXNpY3MuY2xlYXJXYXRlclpvbmVzKCk7XG4gIFxuICB2YXIgZmxvb3JEYXRhID0gY3dfY3JlYXRlRmxvb3IoXG4gICAgd29ybGQsXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCxcbiAgICB3b3JsZF9kZWYudGlsZURpbWVuc2lvbnMsXG4gICAgd29ybGRfZGVmLm1heEZsb29yVGlsZXMsXG4gICAgd29ybGRfZGVmLm11dGFibGVfZmxvb3IsXG4gICAgd29ybGRfZGVmLndhdGVyRW5hYmxlZFxuICApO1xuXG4gIHZhciBsYXN0X3RpbGUgPSBmbG9vckRhdGEuZmxvb3JUaWxlc1tcbiAgICBmbG9vckRhdGEuZmxvb3JUaWxlcy5sZW5ndGggLSAxXG4gIF07XG4gIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChcbiAgICBsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdXG4gICk7XG4gIHdvcmxkLmZpbmlzaExpbmUgPSB0aWxlX3Bvc2l0aW9uLng7XG4gIFxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLklORk8sIFwiV29ybGQgc2V0dXAgY29tcGxldGUgLSBGaW5pc2ggbGluZSBhdCBYOlwiLCB0aWxlX3Bvc2l0aW9uLngudG9GaXhlZCgyKSwgXG4gICAgXCJGbG9vciB0aWxlczpcIiwgZmxvb3JEYXRhLmZsb29yVGlsZXMubGVuZ3RoLCBcIldhdGVyIHpvbmVzOlwiLCBmbG9vckRhdGEud2F0ZXJab25lcy5sZW5ndGgpO1xuICBcbiAgcmV0dXJuIHtcbiAgICB3b3JsZDogd29ybGQsXG4gICAgZmxvb3JUaWxlczogZmxvb3JEYXRhLmZsb29yVGlsZXMsXG4gICAgd2F0ZXJab25lczogZmxvb3JEYXRhLndhdGVyWm9uZXMsXG4gICAgZmluaXNoTGluZTogdGlsZV9wb3NpdGlvbi54XG4gIH07XG59XG5cbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yKHdvcmxkLCBmbG9vcnNlZWQsIGRpbWVuc2lvbnMsIG1heEZsb29yVGlsZXMsIG11dGFibGVfZmxvb3IsIHdhdGVyRW5hYmxlZCkge1xuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBuZXcgYjJWZWMyKC01LCAwKTtcbiAgdmFyIGN3X2Zsb29yVGlsZXMgPSBbXTtcbiAgdmFyIHdhdGVyWm9uZXMgPSBbXTtcbiAgdmFyIHdhdGVyUHJvYmFiaWxpdHkgPSAwLjE1OyAvLyBSZWR1Y2VkIHdhdGVyIHByb2JhYmlsaXR5IHRvIGNvbnRyb2wgdHJhY2sgbGVuZ3RoXG4gIHZhciBtaW5EaXN0YW5jZUJldHdlZW5XYXRlciA9IDEwOyAvLyBJbmNyZWFzZWQgbWluaW11bSBkaXN0YW5jZSB0byBzcHJlYWQgd2F0ZXIgb3V0XG4gIHZhciBsYXN0V2F0ZXJJbmRleCA9IC1taW5EaXN0YW5jZUJldHdlZW5XYXRlcjtcbiAgXG4gIC8vIFRhcmdldCB0aGUgc2FtZSB0cmFjayBsZW5ndGggd2hldGhlciB3YXRlciBpcyBlbmFibGVkIG9yIG5vdFxuICB2YXIgdGFyZ2V0VHJhY2tMZW5ndGggPSBtYXhGbG9vclRpbGVzICogZGltZW5zaW9ucy54OyAvLyBFeHBlY3RlZCB0cmFjayBsZW5ndGggd2l0aG91dCB3YXRlclxuICB2YXIgd2F0ZXJXaWR0aEJ1ZGdldCA9IDA7IC8vIFRyYWNrIGhvdyBtdWNoIGV4dHJhIGxlbmd0aCB3YXRlciBhZGRzXG4gIFxuICBNYXRoLnNlZWRyYW5kb20oZmxvb3JzZWVkKTtcbiAgXG4gIC8vIElNUE9SVEFOVDogV2UgbXVzdCBjcmVhdGUgZXhhY3RseSBtYXhGbG9vclRpbGVzIHRpbGVzIEFORCBtYWludGFpbiBjb25zaXN0ZW50IHRyYWNrIGxlbmd0aFxuICB2YXIgdGlsZXNDcmVhdGVkID0gMDtcbiAgdmFyIHNlZ21lbnRJbmRleCA9IDA7IC8vIFRyYWNrIHBvc2l0aW9uIGZvciB3YXRlciBwbGFjZW1lbnQgZGVjaXNpb25zXG4gIFxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLklORk8sIFwiU3RhcnRpbmcgZmxvb3IgZ2VuZXJhdGlvbiAtIG1heEZsb29yVGlsZXM6XCIsIG1heEZsb29yVGlsZXMsIFwid2F0ZXJFbmFibGVkOlwiLCB3YXRlckVuYWJsZWQsIFwidGFyZ2V0IGxlbmd0aDpcIiwgdGFyZ2V0VHJhY2tMZW5ndGgudG9GaXhlZCgyKSk7XG4gIFxuICB3aGlsZSAodGlsZXNDcmVhdGVkIDwgbWF4Rmxvb3JUaWxlcykge1xuICAgIC8vIENoZWNrIGlmIHdlIHNob3VsZCBjcmVhdGUgd2F0ZXIgaGVyZSAtIHdpdGggYnVkZ2V0IGNvbnRyb2xcbiAgICB2YXIgY3JlYXRlV2F0ZXIgPSBmYWxzZTtcbiAgICBpZiAod2F0ZXJFbmFibGVkICYmIHNlZ21lbnRJbmRleCA+IDE1ICYmIHRpbGVzQ3JlYXRlZCA8IG1heEZsb29yVGlsZXMgLSAzMCkgeyAvLyBEb24ndCBwdXQgd2F0ZXIgdG9vIGVhcmx5IG9yIGxhdGVcbiAgICAgIGlmIChzZWdtZW50SW5kZXggLSBsYXN0V2F0ZXJJbmRleCA+PSBtaW5EaXN0YW5jZUJldHdlZW5XYXRlcikge1xuICAgICAgICAvLyBPbmx5IGNyZWF0ZSB3YXRlciBpZiB3ZSBoYXZlbid0IGV4Y2VlZGVkIG91ciB0cmFjayBsZW5ndGggYnVkZ2V0XG4gICAgICAgIHZhciBwcm9qZWN0ZWRFeHRyYUxlbmd0aCA9IHdhdGVyV2lkdGhCdWRnZXQgKyAoMi41ICogZGltZW5zaW9ucy54KTsgLy8gRXN0aW1hdGUgd2F0ZXIgd2lkdGhcbiAgICAgICAgdmFyIHJlbWFpbmluZ1RpbGVzID0gbWF4Rmxvb3JUaWxlcyAtIHRpbGVzQ3JlYXRlZDtcbiAgICAgICAgdmFyIHByb2plY3RlZFRvdGFsTGVuZ3RoID0gdGlsZV9wb3NpdGlvbi54ICsgKHJlbWFpbmluZ1RpbGVzICogZGltZW5zaW9ucy54KSArIHByb2plY3RlZEV4dHJhTGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb2plY3RlZFRvdGFsTGVuZ3RoIDwgdGFyZ2V0VHJhY2tMZW5ndGggKiAxLjE1KSB7IC8vIEFsbG93IDE1JSBsb25nZXIgbWF4XG4gICAgICAgICAgY3JlYXRlV2F0ZXIgPSBNYXRoLnJhbmRvbSgpIDwgd2F0ZXJQcm9iYWJpbGl0eTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAoY3JlYXRlV2F0ZXIpIHtcbiAgICAgIC8vIENyZWF0ZSBzbWFsbGVyIHdhdGVyIHpvbmVzIHRvIGNvbnRyb2wgdHJhY2sgbGVuZ3RoXG4gICAgICB2YXIgd2F0ZXJXaWR0aCA9IDEuNSArIE1hdGgucmFuZG9tKCkgKiAxLjU7IC8vIDEuNS0zIHRpbGVzIHdpZGUgKHJlZHVjZWQpXG4gICAgICB2YXIgd2F0ZXJEZXB0aCA9IDIuMCArIE1hdGgucmFuZG9tKCkgKiAxLjA7IC8vIDItMyB1bml0cyBkZWVwXG4gICAgICB2YXIgd2F0ZXJQaHlzaWNhbFdpZHRoID0gd2F0ZXJXaWR0aCAqIGRpbWVuc2lvbnMueDtcbiAgICAgIFxuICAgICAgLy8gQ3JlYXRlIHdhdGVyIHpvbmUgYXQgY3VycmVudCBwb3NpdGlvblxuICAgICAgdmFyIHdhdGVyWm9uZSA9IHdhdGVyUGh5c2ljcy5jcmVhdGVXYXRlclpvbmUoXG4gICAgICAgIHdvcmxkLFxuICAgICAgICBuZXcgYjJWZWMyKHRpbGVfcG9zaXRpb24ueCwgdGlsZV9wb3NpdGlvbi55IC0gMC41KSwgLy8gQmVsb3cgZ3JvdW5kIGxldmVsXG4gICAgICAgIHdhdGVyUGh5c2ljYWxXaWR0aCxcbiAgICAgICAgd2F0ZXJEZXB0aFxuICAgICAgKTtcbiAgICAgIHdhdGVyWm9uZXMucHVzaCh3YXRlclpvbmUpO1xuICAgICAgXG4gICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLklORk8sIFwiQ3JlYXRlZCB3YXRlciB6b25lIGF0IHNlZ21lbnRcIiwgc2VnbWVudEluZGV4LCBcIndpZHRoOlwiLCB3YXRlcldpZHRoLnRvRml4ZWQoMiksIFwidGlsZXNcIik7XG4gICAgICBcbiAgICAgIC8vIE1vdmUgcG9zaXRpb24gcGFzdCB0aGUgd2F0ZXIgYW5kIHRyYWNrIHRoZSBleHRyYSBsZW5ndGhcbiAgICAgIHRpbGVfcG9zaXRpb24ueCArPSB3YXRlclBoeXNpY2FsV2lkdGg7XG4gICAgICB3YXRlcldpZHRoQnVkZ2V0ICs9IHdhdGVyUGh5c2ljYWxXaWR0aDtcbiAgICAgIGxhc3RXYXRlckluZGV4ID0gc2VnbWVudEluZGV4O1xuICAgICAgXG4gICAgICAvLyBJbmNyZW1lbnQgc2VnbWVudCBpbmRleCBidXQgTk9UIHRpbGUgY291bnQgKHdhdGVyIGRvZXNuJ3QgY3JlYXRlIHRpbGVzKVxuICAgICAgc2VnbWVudEluZGV4ICs9IE1hdGguZmxvb3Iod2F0ZXJXaWR0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENyZWF0ZSBub3JtYWwgZmxvb3IgdGlsZVxuICAgICAgLy8gVXNlIHRpbGVzQ3JlYXRlZCBmb3IgY29uc2lzdGVudCBkaWZmaWN1bHR5IHByb2dyZXNzaW9uXG4gICAgICBpZiAoIW11dGFibGVfZmxvb3IpIHtcbiAgICAgICAgLy8ga2VlcCBvbGQgaW1wb3NzaWJsZSB0cmFja3MgaWYgbm90IHVzaW5nIG11dGFibGUgZmxvb3JzXG4gICAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcbiAgICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuNSAqIHRpbGVzQ3JlYXRlZCAvIG1heEZsb29yVGlsZXNcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHBhdGggaXMgbXV0YWJsZSBvdmVyIHJhY2VzLCBjcmVhdGUgc21vb3RoZXIgdHJhY2tzXG4gICAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcbiAgICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuMiAqIHRpbGVzQ3JlYXRlZCAvIG1heEZsb29yVGlsZXNcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGN3X2Zsb29yVGlsZXMucHVzaChsYXN0X3RpbGUpO1xuICAgICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xuICAgICAgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xuICAgICAgdGlsZXNDcmVhdGVkKys7XG4gICAgICBzZWdtZW50SW5kZXgrKztcbiAgICB9XG4gIH1cbiAgXG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuSU5GTywgXCJGbG9vciBnZW5lcmF0aW9uIGNvbXBsZXRlIC0gU2VnbWVudHM6XCIsIHNlZ21lbnRJbmRleCwgXCJUaWxlcyBjcmVhdGVkOlwiLCB0aWxlc0NyZWF0ZWQsIFwiV2F0ZXIgem9uZXM6XCIsIHdhdGVyWm9uZXMubGVuZ3RoKTtcbiAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5JTkZPLCBcIkZpbmFsIHBvc2l0aW9uIFg6XCIsIHRpbGVfcG9zaXRpb24ueC50b0ZpeGVkKDIpLCBcIlRhcmdldCB3YXM6XCIsIHRhcmdldFRyYWNrTGVuZ3RoLnRvRml4ZWQoMiksIFwiRGlmZmVyZW5jZTpcIiwgKHRpbGVfcG9zaXRpb24ueCAtIHRhcmdldFRyYWNrTGVuZ3RoKS50b0ZpeGVkKDIpKTtcbiAgXG4gIHJldHVybiB7XG4gICAgZmxvb3JUaWxlczogY3dfZmxvb3JUaWxlcyxcbiAgICB3YXRlclpvbmVzOiB3YXRlclpvbmVzXG4gIH07XG59XG5cblxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3JUaWxlKHdvcmxkLCBkaW0sIHBvc2l0aW9uLCBhbmdsZSkge1xuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG5cbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KHBvc2l0aW9uLngsIHBvc2l0aW9uLnkpO1xuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xuICBmaXhfZGVmLmZyaWN0aW9uID0gMC41O1xuXG4gIHZhciBjb29yZHMgPSBuZXcgQXJyYXkoKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMigwLCAwKSk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgLWRpbS55KSk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoZGltLngsIC1kaW0ueSkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAwKSk7XG5cbiAgdmFyIGNlbnRlciA9IG5ldyBiMlZlYzIoMCwgMCk7XG5cbiAgdmFyIG5ld2Nvb3JkcyA9IGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpO1xuXG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheShuZXdjb29yZHMpO1xuXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcbiAgcmV0dXJuIGJvZHk7XG59XG5cbmZ1bmN0aW9uIGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpIHtcbiAgcmV0dXJuIGNvb3Jkcy5tYXAoZnVuY3Rpb24oY29vcmQpe1xuICAgIHJldHVybiB7XG4gICAgICB4OiBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSAtIE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLngsXG4gICAgICB5OiBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSArIE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLnksXG4gICAgfTtcbiAgfSk7XG59XG4iLCIvKiBnbG9iYWxzIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXG5cbnZhciBsb2dnZXIgPSByZXF1aXJlKFwiLi4vbG9nZ2VyL2xvZ2dlclwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZVdhdGVyWm9uZTogY3JlYXRlV2F0ZXJab25lLFxuICBhcHBseVdhdGVyRm9yY2VzOiBhcHBseVdhdGVyRm9yY2VzLFxuICBpc0luV2F0ZXI6IGlzSW5XYXRlcixcbiAgY2xlYXJGcmFtZUV4aXRUcmFja2luZzogY2xlYXJGcmFtZUV4aXRUcmFja2luZ1xufTtcblxudmFyIHdhdGVyWm9uZXMgPSBbXTtcbnZhciBjYXJzSW5XYXRlciA9IG5ldyBNYXAoKTtcbnZhciBjYXJQYXJ0c0luV2F0ZXIgPSBuZXcgTWFwKCk7IC8vIFRyYWNrIHdoaWNoIHBhcnRzIG9mIGVhY2ggY2FyIGFyZSBpbiB3YXRlclxudmFyIGNhclJlZmVyZW5jZXMgPSBuZXcgTWFwKCk7IC8vIFN0b3JlIGNhciBvYmplY3QgcmVmZXJlbmNlcyBmb3IgZm9yY2UgY2xlYXJpbmdcbnZhciBjYXJFeGl0Rm9yY2VzID0gbmV3IE1hcCgpOyAvLyBUcmFjayBhY2N1bXVsYXRlZCBmb3JjZXMgdG8gY291bnRlciBvbiBleGl0XG52YXIgY2Fyc0p1c3RFeGl0ZWQgPSBuZXcgU2V0KCk7IC8vIFRyYWNrIGNhcnMgdGhhdCBqdXN0IGV4aXRlZCB0aGlzIGZyYW1lXG52YXIgd2F0ZXJQaHlzaWNzRW5hYmxlZCA9IHRydWU7XG52YXIgZXJyb3JDb3VudCA9IDA7XG52YXIgbWF4RXJyb3JzID0gMTA7XG5cbmZ1bmN0aW9uIGNyZWF0ZVdhdGVyWm9uZSh3b3JsZCwgcG9zaXRpb24sIHdpZHRoLCBkZXB0aCkge1xuICAvLyBDcmVhdGUgd2F0ZXIgc2Vuc29yIHpvbmVcbiAgdmFyIHdhdGVyX2JvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICAvLyBQb3NpdGlvbiB3YXRlciB6b25lIGluIHRoZSBtaWRkbGUgb2YgdGhlIGRlcHRoXG4gIHdhdGVyX2JvZHlfZGVmLnBvc2l0aW9uLlNldChwb3NpdGlvbi54ICsgd2lkdGgvMiwgcG9zaXRpb24ueSAtIGRlcHRoLzIpO1xuICBcbiAgdmFyIHdhdGVyX2JvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KHdhdGVyX2JvZHlfZGVmKTtcbiAgdmFyIHdhdGVyX2ZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIHdhdGVyX2ZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcbiAgd2F0ZXJfZml4X2RlZi5zaGFwZS5TZXRBc0JveCh3aWR0aC8yLCBkZXB0aC8yKTtcbiAgd2F0ZXJfZml4X2RlZi5pc1NlbnNvciA9IHRydWU7IC8vIFdhdGVyIGlzIGEgc2Vuc29yLCBub3Qgc29saWRcbiAgd2F0ZXJfZml4X2RlZi51c2VyRGF0YSA9IHsgdHlwZTogXCJ3YXRlclwiLCBkZXB0aDogZGVwdGgsIHdpZHRoOiB3aWR0aCB9O1xuICBcbiAgd2F0ZXJfYm9keS5DcmVhdGVGaXh0dXJlKHdhdGVyX2ZpeF9kZWYpO1xuICBcbiAgLy8gQ3JlYXRlIHNvbGlkIHdhbGxzIGFuZCBmbG9vclxuICB2YXIgd2FsbFRoaWNrbmVzcyA9IDAuMjtcbiAgXG4gIC8vIExlZnQgd2FsbFxuICB2YXIgbGVmdF93YWxsX2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcbiAgbGVmdF93YWxsX2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCAtIHdhbGxUaGlja25lc3MvMiwgcG9zaXRpb24ueSAtIGRlcHRoLzIpO1xuICB2YXIgbGVmdF93YWxsID0gd29ybGQuQ3JlYXRlQm9keShsZWZ0X3dhbGxfZGVmKTtcbiAgdmFyIGxlZnRfd2FsbF9maXggPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIGxlZnRfd2FsbF9maXguc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcbiAgbGVmdF93YWxsX2ZpeC5zaGFwZS5TZXRBc0JveCh3YWxsVGhpY2tuZXNzLzIsIGRlcHRoLzIgKyAwLjUpOyAvLyBFeHRyYSBoZWlnaHQgYWJvdmUgd2F0ZXJcbiAgbGVmdF93YWxsX2ZpeC5mcmljdGlvbiA9IDAuMztcbiAgbGVmdF93YWxsLkNyZWF0ZUZpeHR1cmUobGVmdF93YWxsX2ZpeCk7XG4gIFxuICAvLyBSaWdodCB3YWxsXG4gIHZhciByaWdodF93YWxsX2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcbiAgcmlnaHRfd2FsbF9kZWYucG9zaXRpb24uU2V0KHBvc2l0aW9uLnggKyB3aWR0aCArIHdhbGxUaGlja25lc3MvMiwgcG9zaXRpb24ueSAtIGRlcHRoLzIpO1xuICB2YXIgcmlnaHRfd2FsbCA9IHdvcmxkLkNyZWF0ZUJvZHkocmlnaHRfd2FsbF9kZWYpO1xuICB2YXIgcmlnaHRfd2FsbF9maXggPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIHJpZ2h0X3dhbGxfZml4LnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIHJpZ2h0X3dhbGxfZml4LnNoYXBlLlNldEFzQm94KHdhbGxUaGlja25lc3MvMiwgZGVwdGgvMiArIDAuNSk7XG4gIHJpZ2h0X3dhbGxfZml4LmZyaWN0aW9uID0gMC4zO1xuICByaWdodF93YWxsLkNyZWF0ZUZpeHR1cmUocmlnaHRfd2FsbF9maXgpO1xuICBcbiAgLy8gQm90dG9tIGZsb29yXG4gIHZhciBmbG9vcl9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIGZsb29yX2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCArIHdpZHRoLzIsIHBvc2l0aW9uLnkgLSBkZXB0aCAtIHdhbGxUaGlja25lc3MvMik7XG4gIHZhciBmbG9vciA9IHdvcmxkLkNyZWF0ZUJvZHkoZmxvb3JfZGVmKTtcbiAgdmFyIGZsb29yX2ZpeCA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcbiAgZmxvb3JfZml4LnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGZsb29yX2ZpeC5zaGFwZS5TZXRBc0JveCh3aWR0aC8yICsgd2FsbFRoaWNrbmVzcywgd2FsbFRoaWNrbmVzcy8yKTtcbiAgZmxvb3JfZml4LmZyaWN0aW9uID0gMC41O1xuICBmbG9vci5DcmVhdGVGaXh0dXJlKGZsb29yX2ZpeCk7XG4gIFxuICB2YXIgd2F0ZXJab25lID0ge1xuICAgIGJvZHk6IHdhdGVyX2JvZHksXG4gICAgbGVmdFdhbGw6IGxlZnRfd2FsbCxcbiAgICByaWdodFdhbGw6IHJpZ2h0X3dhbGwsXG4gICAgZmxvb3I6IGZsb29yLFxuICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcbiAgICB3aWR0aDogd2lkdGgsXG4gICAgZGVwdGg6IGRlcHRoLFxuICAgIGRyYWdDb2VmZmljaWVudDogMC41LFxuICAgIGJ1b3lhbmN5RmFjdG9yOiAwLjE1XG4gIH07XG4gIFxuICB3YXRlclpvbmVzLnB1c2god2F0ZXJab25lKTtcbiAgcmV0dXJuIHdhdGVyWm9uZTtcbn1cblxuZnVuY3Rpb24gYXBwbHlXYXRlckZvcmNlcyhjYXIsIHdhdGVyRGF0YSkge1xuICBcbiAgaWYgKCF3YXRlclBoeXNpY3NFbmFibGVkKSB7XG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5XQVJOLCBcIldhdGVyIHBoeXNpY3MgZGlzYWJsZWRcIik7XG4gICAgcmV0dXJuOyAvLyBXYXRlciBwaHlzaWNzIGRpc2FibGVkIGR1ZSB0byBlcnJvcnNcbiAgfVxuICBcbiAgaWYgKCFjYXIgfHwgIWNhci5jaGFzc2lzIHx8ICFjYXIud2hlZWxzIHx8ICF3YXRlckRhdGEpIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLldBUk4sIFwiTWlzc2luZyBjYXIgZGF0YTpcIiwgISFjYXIsICEhKGNhciAmJiBjYXIuY2hhc3NpcyksICEhKGNhciAmJiBjYXIud2hlZWxzKSwgISF3YXRlckRhdGEpO1xuICAgIHJldHVybjsgLy8gU2FmZXR5IGNoZWNrXG4gIH1cbiAgXG4gIC8vIERvdWJsZS1jaGVjayBpZiBjYXIgc2hvdWxkIHN0aWxsIGJlIGluIHdhdGVyXG4gIGlmICghY2FyLmNhckluZGV4ICYmIGNhci5jYXJJbmRleCAhPT0gMCkge1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuV0FSTiwgXCJDYXIgbWlzc2luZyBjYXJJbmRleFwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgXG4gIGlmICghY2Fyc0luV2F0ZXIuaGFzKGNhci5jYXJJbmRleCkpIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLldBUk4sIFwiQXBwbHlpbmcgd2F0ZXIgZm9yY2VzIHRvIGNhclwiLCBjYXIuY2FySW5kZXgsIFwibm90IGluIHdhdGVyIHJlZ2lzdHJ5XCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgLy8gQ1JJVElDQUw6IERvbid0IGFwcGx5IGZvcmNlcyB0byBjYXJzIHRoYXQganVzdCBleGl0ZWQgdGhpcyBmcmFtZVxuICBpZiAoY2Fyc0p1c3RFeGl0ZWQuaGFzKGNhci5jYXJJbmRleCkpIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIlNraXBwaW5nIHdhdGVyIGZvcmNlcyBmb3IgY2FyXCIsIGNhci5jYXJJbmRleCwgXCJ0aGF0IGp1c3QgZXhpdGVkXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgdmFyIGNoYXNzaXMgPSBjYXIuY2hhc3NpcztcbiAgdmFyIHdoZWVscyA9IGNhci53aGVlbHM7XG4gIFxuICAvLyBTdG9yZSBjYXIgcmVmZXJlbmNlIGZvciBmb3JjZSBjbGVhcmluZ1xuICBjYXJSZWZlcmVuY2VzLnNldChjYXIuY2FySW5kZXgsIGNhcik7XG4gIFxuICB0cnkge1xuICAgIC8vIENoZWNrIGlmIGNoYXNzaXMgaXMgc3RpbGwgdmFsaWQgKG5vdCBkZXN0cm95ZWQpXG4gICAgaWYgKCFjaGFzc2lzLklzQWN0aXZlKCkpIHtcbiAgICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQ2FyXCIsIGNhci5jYXJJbmRleCwgXCJjaGFzc2lzIGlzIGluYWN0aXZlLCByZW1vdmluZyBmcm9tIHdhdGVyXCIpO1xuICAgICAgdW5yZWdpc3RlckNhckZyb21XYXRlcihjYXIuY2FySW5kZXgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvLyBWRUxPQ0lUWS1CQVNFRCBXQVRFUiBQSFlTSUNTOiBEaXJlY3RseSBjb250cm9sIHZlbG9jaXR5IGluc3RlYWQgb2YgYXBwbHlpbmcgZm9yY2VzXG4gICAgdmFyIHZlbG9jaXR5ID0gY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpO1xuICAgIGlmICghdmVsb2NpdHkpIHJldHVybjtcbiAgICBcbiAgICAvLyBTaW1wbGUgYXBwcm9hY2g6IGlmIHNpbmtpbmcgKG5lZ2F0aXZlIFkgdmVsb2NpdHkpLCBnaXZlIGdlbnRsZSB1cHdhcmQgdmVsb2NpdHlcbiAgICBpZiAodmVsb2NpdHkueSA8IDAuNSkge1xuICAgICAgLy8gU2V0IGdlbnRsZSB1cHdhcmQgdmVsb2NpdHkgZm9yIGZsb2F0aW5nXG4gICAgICBjaGFzc2lzLlNldExpbmVhclZlbG9jaXR5KG5ldyBiMlZlYzIodmVsb2NpdHkueCwgMC41KSk7XG4gICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXIuY2FySW5kZXgsIFwic2V0IHRvIGZsb2F0IHdpdGggdmVsb2NpdHkgMC41XCIpO1xuICAgIH1cbiAgICBcbiAgICAvLyBIYW5kbGUgd2hlZWxzIHdpdGggc2FtZSBhcHByb2FjaFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgd2hlZWxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgd2hlZWwgPSB3aGVlbHNbaV07XG4gICAgICBpZiAod2hlZWwgJiYgd2hlZWwuSXNBY3RpdmUoKSkge1xuICAgICAgICB2YXIgd2hlZWxWZWxvY2l0eSA9IHdoZWVsLkdldExpbmVhclZlbG9jaXR5KCk7XG4gICAgICAgIGlmICh3aGVlbFZlbG9jaXR5ICYmIHdoZWVsVmVsb2NpdHkueSA8IDAuMykge1xuICAgICAgICAgIHdoZWVsLlNldExpbmVhclZlbG9jaXR5KG5ldyBiMlZlYzIod2hlZWxWZWxvY2l0eS54LCAwLjMpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBcbiAgfSBjYXRjaCAoZSkge1xuICAgIGVycm9yQ291bnQrKztcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkVSUk9SLCBcIkVycm9yIGFwcGx5aW5nIHdhdGVyIGZvcmNlczpcIiwgZSwgXCJFcnJvciBjb3VudDpcIiwgZXJyb3JDb3VudCk7XG4gICAgXG4gICAgaWYgKGVycm9yQ291bnQgPj0gbWF4RXJyb3JzKSB7XG4gICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkVSUk9SLCBcIlRvbyBtYW55IHdhdGVyIHBoeXNpY3MgZXJyb3JzISBEaXNhYmxpbmcgd2F0ZXIgcGh5c2ljc1wiKTtcbiAgICAgIHdhdGVyUGh5c2ljc0VuYWJsZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNJbldhdGVyKGNhcklkKSB7XG4gIHJldHVybiBjYXJzSW5XYXRlci5oYXMoY2FySWQpO1xufVxuXG5mdW5jdGlvbiByZWdpc3RlckNhclBhcnRJbldhdGVyKGNhcklkLCBwYXJ0TmFtZSwgd2F0ZXJVc2VyRGF0YSkge1xuICBpZiAoIWNhclBhcnRzSW5XYXRlci5oYXMoY2FySWQpKSB7XG4gICAgY2FyUGFydHNJbldhdGVyLnNldChjYXJJZCwgbmV3IFNldCgpKTtcbiAgfVxuICBcbiAgdmFyIHBhcnRzID0gY2FyUGFydHNJbldhdGVyLmdldChjYXJJZCk7XG4gIHBhcnRzLmFkZChwYXJ0TmFtZSk7XG4gIFxuICAvLyBPbmx5IHJlZ2lzdGVyIGNhciBpbiB3YXRlciBpZiBpdCB3YXNuJ3QgYWxyZWFkeVxuICBpZiAoIWNhcnNJbldhdGVyLmhhcyhjYXJJZCkpIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXJJZCwgXCJyZWdpc3RlcmVkIGluIHdhdGVyXCIpO1xuICAgIGNhcnNJbldhdGVyLnNldChjYXJJZCwgd2F0ZXJVc2VyRGF0YSk7XG4gIH1cbiAgXG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiQ2FyXCIsIGNhcklkLCBcInBhcnRcIiwgcGFydE5hbWUsIFwiZW50ZXJlZCB3YXRlci4gVG90YWwgcGFydHMgaW4gd2F0ZXI6XCIsIHBhcnRzLnNpemUpO1xufVxuXG5mdW5jdGlvbiB1bnJlZ2lzdGVyQ2FyUGFydEZyb21XYXRlcihjYXJJZCwgcGFydE5hbWUpIHtcbiAgaWYgKCFjYXJQYXJ0c0luV2F0ZXIuaGFzKGNhcklkKSkge1xuICAgIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiVHJpZWQgdG8gdW5yZWdpc3RlciBwYXJ0XCIsIHBhcnROYW1lLCBcImZyb20gY2FyXCIsIGNhcklkLCBcImJ1dCBjYXIgaGFzIG5vIHBhcnRzIGluIHdhdGVyXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBcbiAgdmFyIHBhcnRzID0gY2FyUGFydHNJbldhdGVyLmdldChjYXJJZCk7XG4gIHBhcnRzLmRlbGV0ZShwYXJ0TmFtZSk7XG4gIFxuICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXJJZCwgXCJwYXJ0XCIsIHBhcnROYW1lLCBcImV4aXRlZCB3YXRlci4gUmVtYWluaW5nIHBhcnRzIGluIHdhdGVyOlwiLCBwYXJ0cy5zaXplKTtcbiAgXG4gIC8vIElNTUVESUFURSBDTEVBTlVQOiBSZW1vdmUgY2FyIGZyb20gd2F0ZXIgdHJhY2tpbmcgaW1tZWRpYXRlbHkgd2hlbiBhbnkgbWFqb3IgcGFydCBleGl0c1xuICBpZiAocGFydE5hbWUgPT09IFwiY2hhc3Npc1wiIHx8IHBhcnRzLnNpemUgPT09IDApIHtcbiAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXJJZCwgXCJleGl0aW5nIHdhdGVyIChjaGFzc2lzIG9yIGFsbCBwYXJ0cyBvdXQpIC0gaW1tZWRpYXRlIGNsZWFudXBcIik7XG4gICAgXG4gICAgLy8gSW1tZWRpYXRlIHJlbW92YWwgZnJvbSBhbGwgdHJhY2tpbmdcbiAgICBjYXJzSW5XYXRlci5kZWxldGUoY2FySWQpO1xuICAgIGNhclBhcnRzSW5XYXRlci5kZWxldGUoY2FySWQpO1xuICAgIGNhcnNKdXN0RXhpdGVkLmFkZChjYXJJZCk7XG4gICAgXG4gICAgLy8gQ1JJVElDQUw6IEltbWVkaWF0ZWx5IGNsZWFyIGZvcmNlcyBhbmQgcmVzZXQgdmVsb2NpdHlcbiAgICBjbGVhckNhckZvcmNlcyhjYXJJZCk7XG4gICAgXG4gICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySWQsIFwiY29tcGxldGVseSByZW1vdmVkIGZyb20gd2F0ZXIgdHJhY2tpbmdcIik7XG4gIH1cbn1cblxuLy8gS2VlcCBvbGQgZnVuY3Rpb25zIGZvciBjb21wYXRpYmlsaXR5IGJ1dCByZWRpcmVjdCB0byBuZXcgb25lc1xuZnVuY3Rpb24gcmVnaXN0ZXJDYXJJbldhdGVyKGNhcklkLCB3YXRlclVzZXJEYXRhKSB7XG4gIHJlZ2lzdGVyQ2FyUGFydEluV2F0ZXIoY2FySWQsIFwidW5rbm93blwiLCB3YXRlclVzZXJEYXRhKTtcbn1cblxuZnVuY3Rpb24gdW5yZWdpc3RlckNhckZyb21XYXRlcihjYXJJZCkge1xuICAvLyBGb3JjZSB1bnJlZ2lzdGVyIGFsbCBwYXJ0c1xuICBpZiAoY2FyUGFydHNJbldhdGVyLmhhcyhjYXJJZCkpIHtcbiAgICBjYXJQYXJ0c0luV2F0ZXIuZGVsZXRlKGNhcklkKTtcbiAgfVxuICBpZiAoY2Fyc0luV2F0ZXIuaGFzKGNhcklkKSkge1xuICAgIGNhcnNJbldhdGVyLmRlbGV0ZShjYXJJZCk7XG4gIH1cbiAgY2xlYXJDYXJGb3JjZXMoY2FySWQpO1xufVxuXG5mdW5jdGlvbiBjbGVhckNhckZvcmNlcyhjYXJJZCkge1xuICB2YXIgY2FyUmVmID0gY2FyUmVmZXJlbmNlcy5nZXQoY2FySWQpO1xuICBpZiAoY2FyUmVmICYmIGNhclJlZi5jaGFzc2lzICYmIGNhclJlZi5jaGFzc2lzLklzQWN0aXZlKCkpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHZlbG9jaXR5ID0gY2FyUmVmLmNoYXNzaXMuR2V0TGluZWFyVmVsb2NpdHkoKTtcbiAgICAgIFxuICAgICAgLy8gU0lNUExFIEVYSVQ6IEp1c3QgbGV0IGdyYXZpdHkgd29yayBuYXR1cmFsbHksIG5vIHNwZWNpYWwgZm9yY2VzXG4gICAgICBpZiAodmVsb2NpdHkpIHtcbiAgICAgICAgLy8gT25seSByZXNldCB0byB6ZXJvIGlmIGZsb2F0aW5nIHVwLCBvdGhlcndpc2UgbGV0IGdyYXZpdHkgd29ya1xuICAgICAgICBpZiAodmVsb2NpdHkueSA+IDApIHtcbiAgICAgICAgICBjYXJSZWYuY2hhc3Npcy5TZXRMaW5lYXJWZWxvY2l0eShuZXcgYjJWZWMyKHZlbG9jaXR5LngsIDApKTtcbiAgICAgICAgICBsb2dnZXIubG9nKGxvZ2dlci5MT0dfTEVWRUxTLkRFQlVHLCBcIkNhclwiLCBjYXJJZCwgXCJ1cHdhcmQgdmVsb2NpdHkgcmVzZXQgdG8gMCBvbiBleGl0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGNhclJlZi5jaGFzc2lzLlNldEFuZ3VsYXJWZWxvY2l0eSgwKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gUmVzZXQgd2hlZWwgdmVsb2NpdGllcyBzaW1pbGFybHlcbiAgICAgIGlmIChjYXJSZWYud2hlZWxzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FyUmVmLndoZWVscy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciB3aGVlbCA9IGNhclJlZi53aGVlbHNbaV07XG4gICAgICAgICAgaWYgKHdoZWVsICYmIHdoZWVsLklzQWN0aXZlKCkpIHtcbiAgICAgICAgICAgIHZhciB3aGVlbFZlbCA9IHdoZWVsLkdldExpbmVhclZlbG9jaXR5KCk7XG4gICAgICAgICAgICBpZiAod2hlZWxWZWwgJiYgd2hlZWxWZWwueSA+IDApIHtcbiAgICAgICAgICAgICAgd2hlZWwuU2V0TGluZWFyVmVsb2NpdHkobmV3IGIyVmVjMih3aGVlbFZlbC54LCAwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGVlbC5TZXRBbmd1bGFyVmVsb2NpdHkoMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIENsZWFyIGFjY3VtdWxhdGVkIGZvcmNlIHRyYWNraW5nXG4gICAgICBpZiAoY2FyRXhpdEZvcmNlcy5oYXMoY2FySWQpKSB7XG4gICAgICAgIGNhckV4aXRGb3JjZXMuZGVsZXRlKGNhcklkKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5ERUJVRywgXCJDYXJcIiwgY2FySWQsIFwid2F0ZXIgZXhpdCAtIHZlbG9jaXR5IG5vcm1hbGl6ZWRcIik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nZ2VyLmxvZyhsb2dnZXIuTE9HX0xFVkVMUy5FUlJPUiwgXCJFcnJvciBjbGVhcmluZyBmb3JjZXMgZm9yIGNhclwiLCBjYXJJZCwgXCI6XCIsIGUpO1xuICAgIH1cbiAgfVxuICBcbiAgY2FyUmVmZXJlbmNlcy5kZWxldGUoY2FySWQpO1xufVxuXG5mdW5jdGlvbiBjbGVhckZyYW1lRXhpdFRyYWNraW5nKCkge1xuICAvLyBDbGVhciB0aGUgc2V0IG9mIGNhcnMgdGhhdCBleGl0ZWQgdGhpcyBmcmFtZSAtIGNhbGxlZCBhdCB0aGUgc3RhcnQgb2YgZWFjaCBwaHlzaWNzIHN0ZXBcbiAgY2Fyc0p1c3RFeGl0ZWQuY2xlYXIoKTtcbn1cblxuLy8gRXhwb3J0IGludGVybmFsIGZ1bmN0aW9ucyBmb3IgY29sbGlzaW9uIGhhbmRsaW5nXG5tb2R1bGUuZXhwb3J0cy5yZWdpc3RlckNhckluV2F0ZXIgPSByZWdpc3RlckNhckluV2F0ZXI7XG5tb2R1bGUuZXhwb3J0cy51bnJlZ2lzdGVyQ2FyRnJvbVdhdGVyID0gdW5yZWdpc3RlckNhckZyb21XYXRlcjtcbm1vZHVsZS5leHBvcnRzLnJlZ2lzdGVyQ2FyUGFydEluV2F0ZXIgPSByZWdpc3RlckNhclBhcnRJbldhdGVyO1xubW9kdWxlLmV4cG9ydHMudW5yZWdpc3RlckNhclBhcnRGcm9tV2F0ZXIgPSB1bnJlZ2lzdGVyQ2FyUGFydEZyb21XYXRlcjtcbm1vZHVsZS5leHBvcnRzLmdldFdhdGVyWm9uZXMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHdhdGVyWm9uZXM7IH07XG5tb2R1bGUuZXhwb3J0cy5nZXRDYXJzSW5XYXRlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gY2Fyc0luV2F0ZXI7IH07XG5tb2R1bGUuZXhwb3J0cy5jbGVhcldhdGVyWm9uZXMgPSBmdW5jdGlvbigpIHsgXG4gIHdhdGVyWm9uZXMgPSBbXTtcbiAgY2Fyc0luV2F0ZXIuY2xlYXIoKTtcbiAgY2FyUGFydHNJbldhdGVyLmNsZWFyKCk7XG4gIGNhclJlZmVyZW5jZXMuY2xlYXIoKTtcbiAgY2FyRXhpdEZvcmNlcy5jbGVhcigpO1xuICBjYXJzSnVzdEV4aXRlZC5jbGVhcigpO1xuICB3YXRlclBoeXNpY3NFbmFibGVkID0gdHJ1ZTtcbiAgZXJyb3JDb3VudCA9IDA7XG4gIGxvZ2dlci5sb2cobG9nZ2VyLkxPR19MRVZFTFMuREVCVUcsIFwiV2F0ZXIgem9uZXMgY2xlYXJlZCwgcGh5c2ljcyByZS1lbmFibGVkXCIpO1xufTsiXX0=
