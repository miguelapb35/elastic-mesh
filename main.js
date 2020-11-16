window.addEventListener('resize', resize, false);

var cellSize = 50;
var isometric = true;
var connectCross = false; //only for non-isometric

//coefficient for the degredation in a particles velocity each tick
//should stay between 0 and 1
var friction = .04;

//coefficient for the magnitude of the vector applied when the mesh is deformed
//should stay between 0 and 1
//TODO - determine the reason for strange behavior beyond .2
var elasticity = .1; 

//Coefficient for how deformed the grid is allowed to become
var deformation = 0;

function Point(i, j){
  this.x = (random()*deformation + i)*cellSize;
  this.y = (random()*deformation + j)*cellSize;
  this.connections = [];
  this.velocityX = 0;
  this.velocityY = 0;
}

Point.prototype.tick = function(){
  if(!(selectedPoint == undefined) && this.equals(selectedPoint)) return;
  
  for (var i = 0; i < this.connections.length; i++){
    this.connections[i].applyVector(this);
  }
  
  
  
  this.x += this.velocityX;
  this.y += this.velocityY;
  this.velocityX *= (1 - friction);
  this.velocityY *= (1 - friction);
  if (abs(this.velocityX) < 1) this.velocityX = 0;
  if (abs(this.velocityY) < 1) this.velocityY = 0;
  // if (this.x < 0) this.x = 0;
  // if (this.y < 0) this.y = 0;
  // if (this.x >= width) this.x = width-1;
  // if (this.y >= height) this.y = height-1;
}

Point.prototype.render = function(){
  ellipse(this.x, this.y, 10, 10);
}

Point.prototype.equals = function(p){
  if (p.x == undefined || p.y == undefined) return false;
  return (this.x == p.x && this.y == p.y);
}

Point.prototype.hasConnection = function(p){
  for (var i = 0; i < this.connections.length; i++){
    var c = connections[i];
    if (c.p1.equals(p)) return true;
    if (c.p2.equals(p)) return true;
  }
  return false;
}

function Connection(p1, p2){
  this.p1 = p1;
  this.p2 = p2;
  var xDiff = p1.x - p2.x;
  var yDiff = p1.y - p2.y;
  this.dist = dist(p1.x, p1.y, p2.x, p2.y);
  this.goalDistance = this.dist;
}

Connection.prototype.tick = function(){
  this.dist = dist(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
}

Connection.prototype.render = function(){
  stroke(180 - abs(this.dist - this.goalDistance), 100, 100);
  line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
  stroke(100);
}

Connection.prototype.applyVector = function(p){
  // if (abs(this.dist - this.magnitude) < 5) return;
  var magnitude = (this.dist - (this.goalDistance))*elasticity;
  var angle = 0;
  if (this.p1.equals(p)){
    angle = atan2(this.p2.y - this.p1.y, this.p2.x - this.p1.x);
  } else {
    angle = atan2(this.p1.y - this.p2.y, this.p1.x - this.p2.x);
  }
  p.velocityX += cos(angle)*magnitude;
  p.velocityY += sin(angle)*magnitude;
  
  //TODO see if a viable limited-depth recursion model exists
  
  // for (var i = 0; i < p.connections.length; i++){
  //   var c = p.connections[i];
  //   if (!c.p1.equals(p)){
  //     c.p1.velocityX += cos(angle)*magnitude*.1;
  //     c.p1.velocityY += sin(angle)*magnitude*.1;
  //   }
  //   if (!c.p2.equals(p)){
  //     c.p2.velocityX += cos(angle)*magnitude*.1;
  //     c.p2.velocityY += sin(angle)*magnitude*.1;
  //   }
  // }
}

var grid;
var points;
var connections;
var gridWidth;
var gridHeight;
var selectedPoint = undefined;

function setup(){
  createCanvas();
  ellipseMode(CENTER);
  colorMode(HSB, 360, 100, 100);
  resize();
  
  var gui = new dat.GUI();
  gui.add(this, "friction", 0, 1);
  gui.add(this, "elasticity", 0, 1);
  
  var f1 = gui.addFolder("Init Params");
  f1.add(this, "cellSize", 20, 100);
  f1.add(this, "deformation", 0, 2, .01);
  f1.add(this, "isometric");
  f1.add(this, "connectCross");
  
  gui.add(this, "recreate");
  
  
  recreate();
}

function recreate(){
  grid = [];
  gridWidth = width/cellSize;
  gridHeight = height/cellSize;
  
  points = [];
  connections = [];
  
  for (var i = 0; i < gridWidth; i++){
    grid.push([]);
    for (var j = 0; j < gridHeight; j++){
      var p;
      if (isometric && j%2 == 0) p = new Point(i + 0.5, j);
      else p = new Point(i, j);
      grid[i].push(p);
      points.push(p);
    }
  }
  
  var ortho = [[0, -1],[0, 1],[1, 0],[-1, 0]];
  var diag = [[-1, -1],[1, -1],[-1, 1],[1, 1]];
  var iso1 = [[-1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  var iso2 = [[0, -1], [1, -1], [1, 0], [0, 1], [1, 1]];
  
  for (var i = 0; i < gridWidth; i++){
    for (var j = 0; j < gridHeight; j++){
      var p1 = grid[i][j];
      if (isometric){
        if (j%2 == 0){
          connectPointList(iso2, i, j, p1);
        } else {
          connectPointList(iso1, i, j, p1);
        }
      } else {
        if((i+j)%2 == 1 || connectCross){
          connectPointList(diag, i, j, p1);
        }
        connectPointList(ortho, i, j , p1);
      }
      
    }
  }  
}

function connectPointList(modList, i , j, p1){
  for (var m = 0; m < 4; m++){
    var mod = modList[m];
    var k = i + mod[0];
    var l = j + mod[1];
    if (k >= 0 && k < gridWidth && l >= 0 && l < gridHeight){
      var p2 = grid[k][l];
      createConnection(p1, p2);
    }
  }
}

function createConnection(p1, p2){
  if (!p1.hasConnection(p2)){
    var c = new Connection(p1, p2);
    p1.connections.push(c);
    p2.connections.push(c);
    connections.push(c);
  }
}

function draw(){
  background(0);
  if (points == undefined) return;
  
  stroke(255);
  fill(255);
  
  for (var i = 0; i < connections.length; i++){
    connections[i].tick();
  }
  for (var i = 0; i < points.length; i++){
    points[i].tick();
  }
  for (var i = 0; i < connections.length; i++){
    connections[i].render();
  }
  for (var i = 0; i < points.length; i++){
    points[i].render();
  }
}

function mousePressed(){
  for (var i = 0; i < points.length; i++){
    var p = points[i];
    if (dist(p.x, p.y, mouseX, mouseY) < 10){
      selectedPoint = p;
      return;
    }
  }
}

function mouseDragged(){
  if (selectedPoint != undefined){
    selectedPoint.x = mouseX;
    selectedPoint.y = mouseY;
  }
}

function mouseReleased(){
  if (selectedPoint != undefined){
    selectedPoint.velocityX = mouseX - pmouseX;
    selectedPoint.velocityY = mouseY - pmouseY;
    selectedPoint = undefined;
  }
}

function resize(){
  resizeCanvas(window.innerWidth, window.innerHeight);
}