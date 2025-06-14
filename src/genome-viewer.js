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