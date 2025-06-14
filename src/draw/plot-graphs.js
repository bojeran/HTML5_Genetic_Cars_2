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
