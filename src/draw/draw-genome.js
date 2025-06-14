var logger = require("../logger/logger");

module.exports = {
  showGenomeView: showGenomeView,
  hideGenomeView: hideGenomeView,
  createGenomeModal: createGenomeModal
};

function showGenomeView(genomeData) {
  logger.log(logger.LOG_LEVELS.DEBUG, "Showing genome view for car:", genomeData.def.id);
  
  var modal = document.getElementById("genome-modal");
  if (!modal) {
    modal = createGenomeModal();
  }
  
  populateGenomeData(modal, genomeData);
  modal.style.display = "block";
  
  // Prevent body scroll when modal is open
  document.body.style.overflow = "hidden";
}

function hideGenomeView() {
  var modal = document.getElementById("genome-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

function createGenomeModal() {
  var modal = document.createElement("div");
  modal.id = "genome-modal";
  modal.className = "genome-modal";
  
  modal.innerHTML = `
    <div class="genome-modal-content">
      <div class="genome-modal-header">
        <h2>Car Genome Analysis</h2>
        <span class="genome-modal-close">&times;</span>
      </div>
      <div class="genome-modal-body">
        <div class="genome-tabs">
          <button class="genome-tab-btn active" data-tab="overview">Overview</button>
          <button class="genome-tab-btn" data-tab="chassis">Chassis</button>
          <button class="genome-tab-btn" data-tab="wheels">Wheels</button>
          <button class="genome-tab-btn" data-tab="ancestry">Ancestry</button>
        </div>
        
        <div class="genome-tab-content">
          <div id="genome-overview" class="genome-tab-panel active">
            <div class="genome-stats">
              <h3>Performance</h3>
              <div class="stat-row">
                <span class="stat-label">Score:</span>
                <span id="genome-score" class="stat-value">-</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Distance:</span>
                <span id="genome-distance" class="stat-value">-</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Max Height:</span>
                <span id="genome-max-height" class="stat-value">-</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Min Height:</span>
                <span id="genome-min-height" class="stat-value">-</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Generation:</span>
                <span id="genome-generation" class="stat-value">-</span>
              </div>
            </div>
            
            <div class="genome-visual">
              <h3>Car Visualization</h3>
              <canvas id="genome-canvas" width="300" height="200"></canvas>
            </div>
          </div>
          
          <div id="genome-chassis" class="genome-tab-panel">
            <h3>Chassis Properties</h3>
            <div class="genome-property">
              <label>Density:</label>
              <span id="chassis-density" class="property-value">-</span>
              <div class="property-bar">
                <div id="chassis-density-bar" class="property-fill"></div>
              </div>
            </div>
            
            <h4>Shape Vertices</h4>
            <div id="chassis-vertices" class="vertices-grid">
              <!-- Vertices will be populated here -->
            </div>
          </div>
          
          <div id="genome-wheels" class="genome-tab-panel">
            <h3>Wheel Properties</h3>
            <div id="wheels-container">
              <!-- Wheel data will be populated here -->
            </div>
          </div>
          
          <div id="genome-ancestry" class="genome-tab-panel">
            <h3>Genetic Lineage</h3>
            <div class="ancestry-info">
              <div class="stat-row">
                <span class="stat-label">Car ID:</span>
                <span id="car-id" class="stat-value">-</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Is Elite:</span>
                <span id="car-elite" class="stat-value">-</span>
              </div>
            </div>
            <div id="ancestry-tree">
              <!-- Ancestry tree will be populated here -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  var closeBtn = modal.querySelector(".genome-modal-close");
  closeBtn.addEventListener("click", hideGenomeView);
  
  // Close modal when clicking outside
  modal.addEventListener("click", function(e) {
    if (e.target === modal) {
      hideGenomeView();
    }
  });
  
  // Tab switching
  var tabBtns = modal.querySelectorAll(".genome-tab-btn");
  tabBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var targetTab = this.getAttribute("data-tab");
      switchGenomeTab(targetTab);
    });
  });
  
  // Keyboard navigation
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && modal.style.display === "block") {
      hideGenomeView();
    }
  });
  
  return modal;
}

function switchGenomeTab(tabName) {
  // Hide all tab panels
  var panels = document.querySelectorAll(".genome-tab-panel");
  panels.forEach(function(panel) {
    panel.classList.remove("active");
  });
  
  // Remove active class from all tab buttons
  var buttons = document.querySelectorAll(".genome-tab-btn");
  buttons.forEach(function(btn) {
    btn.classList.remove("active");
  });
  
  // Show target panel and activate button
  var targetPanel = document.getElementById("genome-" + tabName);
  var targetButton = document.querySelector(`[data-tab="${tabName}"]`);
  
  if (targetPanel) targetPanel.classList.add("active");
  if (targetButton) targetButton.classList.add("active");
}

function populateGenomeData(modal, genomeData) {
  var def = genomeData.def;
  var score = genomeData.score;
  
  logger.log(logger.LOG_LEVELS.DEBUG, "Populating genome data:", def);
  
  // Overview tab
  document.getElementById("genome-score").textContent = Math.round(score.v * 100) / 100;
  document.getElementById("genome-distance").textContent = Math.round(score.x * 100) / 100 + "m";
  document.getElementById("genome-max-height").textContent = Math.round(score.y * 100) / 100 + "m";
  document.getElementById("genome-min-height").textContent = Math.round(score.y2 * 100) / 100 + "m";
  document.getElementById("genome-generation").textContent = score.i || "Unknown";
  
  // Draw car visualization
  drawCarVisualization(def);
  
  // Chassis tab
  if (def.chassis_density && def.chassis_density.length > 0) {
    var chassisDensity = def.chassis_density[0];
    document.getElementById("chassis-density").textContent = Math.round(chassisDensity * 100) / 100;
    
    // Update density bar (normalize to 0-100%)
    var densityPercent = Math.min(100, (chassisDensity / 400) * 100);
    document.getElementById("chassis-density-bar").style.width = densityPercent + "%";
  }
  
  // Populate chassis vertices
  if (def.vertex_list) {
    populateChassisVertices(def.vertex_list);
  }
  
  // Wheels tab
  if (def.wheel_radius && def.wheel_density && def.wheel_vertex) {
    populateWheelData(def);
  }
  
  // Ancestry tab
  document.getElementById("car-id").textContent = def.id || "Unknown";
  document.getElementById("car-elite").textContent = def.is_elite ? "Yes" : "No";
  
  if (def.ancestry) {
    populateAncestryTree(def.ancestry);
  } else {
    document.getElementById("ancestry-tree").innerHTML = "<p>No ancestry data available (Generation 0 car)</p>";
  }
}

function drawCarVisualization(def) {
  var canvas = document.getElementById("genome-canvas");
  var ctx = canvas.getContext("2d");
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set up coordinate system (center the car)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(50, -50); // Scale and flip Y axis
  
  // Draw chassis
  if (def.vertex_list && def.vertex_list.length >= 12) {
    drawChassis(ctx, def.vertex_list, def.chassis_density);
  }
  
  // Draw wheels
  if (def.wheel_radius && def.wheel_density && def.wheel_vertex) {
    drawWheels(ctx, def);
  }
  
  ctx.restore();
}

function drawChassis(ctx, vertices, densityArray) {
  // Create chassis shape from vertices
  var chassisDensity = densityArray && densityArray.length > 0 ? densityArray[0] : 100;
  
  // Color based on density (darker = denser)
  var densityRatio = Math.min(1, chassisDensity / 400);
  var grayValue = Math.floor(255 * (1 - densityRatio * 0.7));
  ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.02;
  
  // Build vertex list (same logic as in def-to-car.js)
  var vertex_list = [];
  vertex_list.push({x: vertices[0], y: 0});
  vertex_list.push({x: vertices[1], y: vertices[2]});
  vertex_list.push({x: 0, y: vertices[3]});
  vertex_list.push({x: -vertices[4], y: vertices[5]});
  vertex_list.push({x: -vertices[6], y: 0});
  vertex_list.push({x: -vertices[7], y: -vertices[8]});
  vertex_list.push({x: 0, y: -vertices[9]});
  vertex_list.push({x: vertices[10], y: -vertices[11]});
  
  // Draw chassis
  ctx.beginPath();
  ctx.moveTo(vertex_list[0].x, vertex_list[0].y);
  for (var i = 1; i < vertex_list.length; i++) {
    ctx.lineTo(vertex_list[i].x, vertex_list[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawWheels(ctx, def) {
  // Build vertex list for wheel positioning
  var vertices = def.vertex_list;
  var vertex_list = [];
  vertex_list.push({x: vertices[0], y: 0});
  vertex_list.push({x: vertices[1], y: vertices[2]});
  vertex_list.push({x: 0, y: vertices[3]});
  vertex_list.push({x: -vertices[4], y: vertices[5]});
  vertex_list.push({x: -vertices[6], y: 0});
  vertex_list.push({x: -vertices[7], y: -vertices[8]});
  vertex_list.push({x: 0, y: -vertices[9]});
  vertex_list.push({x: vertices[10], y: -vertices[11]});
  
  // Draw each wheel
  for (var i = 0; i < def.wheel_radius.length; i++) {
    var radius = def.wheel_radius[i];
    var density = def.wheel_density[i];
    var vertexIndex = def.wheel_vertex[i];
    
    if (vertexIndex < vertex_list.length) {
      var pos = vertex_list[vertexIndex];
      
      // Color based on density
      var densityRatio = Math.min(1, density / 140);
      var grayValue = Math.floor(255 * (1 - densityRatio * 0.7));
      ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.02;
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function populateChassisVertices(vertices) {
  var container = document.getElementById("chassis-vertices");
  container.innerHTML = "";
  
  var labels = [
    "Right X", "Upper Right X", "Upper Right Y", "Top Y",
    "Upper Left X", "Upper Left Y", "Left X", "Lower Left X",
    "Lower Left Y", "Bottom Y", "Lower Right X", "Lower Right Y"
  ];
  
  for (var i = 0; i < vertices.length && i < labels.length; i++) {
    var vertexDiv = document.createElement("div");
    vertexDiv.className = "vertex-item";
    vertexDiv.innerHTML = `
      <span class="vertex-label">${labels[i]}:</span>
      <span class="vertex-value">${Math.round(vertices[i] * 1000) / 1000}</span>
    `;
    container.appendChild(vertexDiv);
  }
}

function populateWheelData(def) {
  var container = document.getElementById("wheels-container");
  container.innerHTML = "";
  
  for (var i = 0; i < def.wheel_radius.length; i++) {
    var wheelDiv = document.createElement("div");
    wheelDiv.className = "wheel-item";
    
    var radius = def.wheel_radius[i];
    var density = def.wheel_density[i];
    var vertex = def.wheel_vertex[i];
    
    wheelDiv.innerHTML = `
      <h4>Wheel ${i + 1}</h4>
      <div class="wheel-properties">
        <div class="genome-property">
          <label>Radius:</label>
          <span class="property-value">${Math.round(radius * 1000) / 1000}</span>
          <div class="property-bar">
            <div class="property-fill" style="width: ${(radius / 0.7) * 100}%"></div>
          </div>
        </div>
        <div class="genome-property">
          <label>Density:</label>
          <span class="property-value">${Math.round(density * 100) / 100}</span>
          <div class="property-bar">
            <div class="property-fill" style="width: ${(density / 140) * 100}%"></div>
          </div>
        </div>
        <div class="genome-property">
          <label>Attachment Point:</label>
          <span class="property-value">Vertex ${vertex}</span>
        </div>
      </div>
    `;
    
    container.appendChild(wheelDiv);
  }
}

function populateAncestryTree(ancestry) {
  var container = document.getElementById("ancestry-tree");
  container.innerHTML = "";
  
  if (!ancestry || ancestry.length === 0) {
    container.innerHTML = "<p>No parent information available</p>";
    return;
  }
  
  var treeDiv = document.createElement("div");
  treeDiv.className = "ancestry-tree";
  
  function renderParent(parent, depth) {
    var parentDiv = document.createElement("div");
    parentDiv.className = "ancestry-node";
    parentDiv.style.marginLeft = (depth * 20) + "px";
    
    parentDiv.innerHTML = `
      <div class="ancestry-node-content">
        <strong>Parent ID:</strong> ${parent.id || 'Unknown'}<br>
        <strong>Depth:</strong> ${depth}
      </div>
    `;
    
    treeDiv.appendChild(parentDiv);
    
    if (parent.ancestry && parent.ancestry.length > 0) {
      parent.ancestry.forEach(function(grandparent) {
        renderParent(grandparent, depth + 1);
      });
    }
  }
  
  var header = document.createElement("h4");
  header.textContent = "Parent Lineage:";
  container.appendChild(header);
  
  ancestry.forEach(function(parent) {
    renderParent(parent, 0);
  });
  
  container.appendChild(treeDiv);
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.showGenomeView = showGenomeView;
  window.hideGenomeView = hideGenomeView;
}