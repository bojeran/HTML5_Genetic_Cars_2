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