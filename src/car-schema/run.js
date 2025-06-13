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
