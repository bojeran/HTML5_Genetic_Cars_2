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
    logger.log(logger.LOG_LEVELS.INFO, "Car", carId, "registered in water");
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
    logger.log(logger.LOG_LEVELS.INFO, "Car", carId, "exiting water (chassis or all parts out) - immediate cleanup");
    
    // Immediate removal from all tracking
    carsInWater.delete(carId);
    carPartsInWater.delete(carId);
    carsJustExited.add(carId);
    
    // CRITICAL: Immediately clear forces and reset velocity
    clearCarForces(carId);
    
    logger.log(logger.LOG_LEVELS.INFO, "Car", carId, "completely removed from water tracking");
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
          logger.log(logger.LOG_LEVELS.INFO, "Car", carId, "upward velocity reset to 0 on exit");
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
      
      logger.log(logger.LOG_LEVELS.INFO, "Car", carId, "water exit - velocity normalized");
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
  logger.log(logger.LOG_LEVELS.INFO, "Water zones cleared, physics re-enabled");
};