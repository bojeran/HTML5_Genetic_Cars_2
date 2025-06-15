/* globals btoa */
var setupScene = require("./setup-scene");
var carRun = require("../car-schema/run");
var defToCar = require("../car-schema/def-to-car");
var waterPhysics = require("./water-physics");
var logger = require("../logger/logger");

module.exports = runDefs;
function runDefs(world_def, defs, listeners) {
  // Debug logging (level set by entry point)
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
