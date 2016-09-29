//*************************
//Initialize canvas
//*************************
var canvas = document.getElementById("canvas");
canvas.onselectstart = function() { return false; }
canvas.onmousedown = function() { return false; }
var context = canvas.getContext("2d");
context.textBaseline = "top";
context.font = "14px Trebuchet MS";

var fixedMod = function(number, mod) {
    return ((number%mod)+mod)%mod;
};

//*************************
// Game objects
//*************************
//Controllable player
var player = {speed: 250, x: 0, y: 0, width:10, height:10, angle: 0, targetx: 0, targety: 0, targetangle: 0, distance: 0, distancex: 0, distancey: 0};
//Playable canvas bounds
var canvasplayable = {x: 0, y: 0, width:500, height:480};
var left_bound = {x: 0, y: 0, width: 1, height: 480};
var right_bound = {x: 500, y: 0, width: 1, height: 480};
var top_bound = {x: 0, y: 0, width: 500, height: 1};
var bot_bound = {x: 0, y: 480, width: 500, height: 1};
//Levels
var level;	
var score = 0;
var levelIndex = 1;


//*************************
//Function to take an event and return the X and Y coordinates of the cursor on that canvas
//*************************
function relMouseCoords(event){
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return {x:canvasX, y:canvasY}
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

//*************************
//Input events (key press to prevent scrolling, and click to move player)
//*************************
addEventListener("keydown", function(e) 
	{ 
		//Add any pressed key to the list of pressed keys
		//If arrow keys or space, prevent default action (this prevents accidental scrolling of the web page)
		switch(e.keyCode){
			case 37: case 38: case 39: case 40: case 32: e.preventDefault(); break;
			default: break;
		}
	}, false);
addEventListener("mousedown", function(e)
	{
		clickCoords = canvas.relMouseCoords(e);
		//On each click, update the following. These are coordinates of mouse click, and distance (x, y, and overall) between player and target. Used for movement.
		player.targetx = clickCoords.x;
		player.targety = clickCoords.y;
		player.distancex = player.targetx-player.x;
		player.distancey = player.targety-player.y;
		player.distance = Math.sqrt(Math.pow(player.distancex,2)+Math.pow(player.distancey,2));
		player.targetangle = Math.atan2(player.distancey, player.distancex) * 180 / Math.PI + 180;

	}, false);
	
//*************************
// Load Level
//*************************
var loadLevel = function(currentLevel) {
	$.ajax({
		url: currentLevel,
		async: false,
		dataType: 'json',
		success: function (json) {
			level = json;
			for(i = 0; i < json.enemies.length; i++) {
				if( json.enemies[i].xmove === "random" ) level.enemies[i].xmove = (Math.round(Math.random()) * 2 - 1)*Math.random();
				if( json.enemies[i].ymove === "random" ) level.enemies[i].ymove = (Math.round(Math.random()) * 2 - 1)*Math.random();
			}
		}
	});
}
	
//*************************
//Reset function (reset player position)
//*************************
var reset = function() {
	player.x = level.startpoint[0].x;
	player.y = level.startpoint[0].y;
	player.targetx = player.x;
	player.targety = player.y;

}

//*************************
//Quadrant of unit circle
//*************************
var quadrant = function(character) {
	if(character.angle >= 0 && character.angle < (3.14/2)) return 1; // aiming down right, 0 is going straight right
	else if(character.angle >= (3.14/2) && character.angle < 3.14) return 2; // aiming down left
	else if(character.angle >= -3.14 && character.angle < -(3.14/2)) return 3; //aiming up left
	else if(character.angle >= -(3.14/2) && character.angle < 0) return 4; // aiming up right
}

//*************************
//Update game objects
//*************************
var update = function(modifier) {

	//Check for collision with slick area
	collisionSlick = false;
	for(i = 0; i < level.slickbox.length; i++) if(rectCollision(player,level.slickbox[i])) collisionSlick = true;
	if(collisionSlick)
	{
		//SLICK AREA
		//Make sure player angle never exceeds 360
		player.angle = fixedMod(player.angle, 360);
		//To figure out which direction to turn if target changes, normalize target angle
		tempAngle = player.targetangle - player.angle;
		if(tempAngle < 0) tempAngle += 360;
		else if(tempAngle > 360) tempAngle -= 360;
		
		//Change player angle based on location
		if(tempAngle < 180) player.angle += 5;
		else player.angle -= 5;
		
		//Update position based on angle
		player.y += player.speed * Math.sin((player.angle - 180)*Math.PI/180) * modifier;
		player.x += player.speed * Math.cos((player.angle - 180)*Math.PI/180) * modifier;
		
		//Map design should prevent player from sliding off map, but in case it happens then reset that map
		if(rectCollision(player,top_bound) | rectCollision(player,bot_bound) | rectCollision(player,left_bound) | rectCollision(player,right_bound)) reset();
	} else 
	{		
		//Update player position based on target (they will move in a straight line to the target
		if(player.x > player.targetx+2 || player.x < player.targetx-2) player.x += player.speed * modifier * (player.distancex)/player.distance;
		if(player.y > player.targety+2 || player.y < player.targety-2) player.y += player.speed * modifier * (player.distancey)/player.distance;

		//Calculate player angle based on the move last used
		player.angle = Math.atan2(player.distancey,player.distancex) * 180 / Math.PI + 180; //generates angle between 0 and 360 degrees
	}
	
	//Check for collision with no-walk areas; if there is one, call reset function
	collisionNoWalk = false; 
	for(i = 0; i < level.nowalkbox.length; i++) if(rectCollision(player,level.nowalkbox[i])) collisionNoWalk = true;
	if(collisionNoWalk)	reset();
	
	//Update enemy positions (+/- 2 pixels because some collision measuring multiple and the sign flip messed it up and this is quick fix)
	for(i = 0; i<level.enemies.length; i++)
	{
		if(rectCollision(level.enemies[i],right_bound)) {level.enemies[i].xmove *= -1; level.enemies[i].x -= 2;}
		if(rectCollision(level.enemies[i],left_bound)) {level.enemies[i].xmove *= -1; level.enemies[i].x += 2;}
		if(rectCollision(level.enemies[i],top_bound)) {level.enemies[i].ymove *= -1; level.enemies[i].y += 2;}
		if(rectCollision(level.enemies[i],bot_bound)) {level.enemies[i].ymove *= -1; level.enemies[i].y -= 2;}
		level.enemies[i].y += modifier * level.enemies[i].ymove * 256;
		level.enemies[i].x += modifier * level.enemies[i].xmove * 256;
	}
	
	//Check if player is inside safezone; if player is OUTSIDE safe zone, check for enemy collision and reset upon collision
	flagSafe = false;
	for(i = 0; i<level.startpoint.length; i++) {if (rectCollision(player,level.startpoint[i])) flagSafe = true;}
	
	if(!flagSafe)
	{
		for(i = 0; i<level.enemies.length; i++)
		{
			if (rectCollision(player,level.enemies[i]))
			{
				reset();
			}
		}
	}
	
	//Check if player has made it to end of level
	for(i = 0; i<level.endpoint.length; i++)
	{
		if(rectCollision(player,level.endpoint[i]))
		{
			score++;
			levelIndex++;
			loadLevel("levels/"+ levelIndex.toString() + ".json");
			reset();
		}
	}
};

//*************************
//Collision detection
//*************************
var rectCollision = function(obj1, obj2)
{
	if (
		obj1.x <= (obj2.x + obj2.width) //obj1 left side is to the left of obj2 right side
		&& (obj1.x + obj1.width) >= obj2.x //obj1 right side is to the right of obj2 left side
		&& obj1.y <= (obj2.y + obj2.height) //obj1 top side is above obj2 bottom side
		&& (obj1.y + obj1.height) >= obj2.y //obj1 bottom side is below obj2 top side
	) return true;
}

//*************************
//Render
//*************************
var render = function() {
	context.fillStyle = "black";
	//Clear the canvas
	context.clearRect(0,0,canvas.width,canvas.height);
	//Draw score text
	context.fillText("Level: " + levelIndex,1,484);
	//Draw slick area
	context.fillStyle = "green";
	for(i = 0; i < level.slickbox.length; i++) context.fillRect(level.slickbox[i].x, level.slickbox[i].y, level.slickbox[i].width, level.slickbox[i].height);
	//Draw unwalkable area
	context.fillStyle = "red";
	for(i = 0; i < level.nowalkbox.length; i++) context.fillRect(level.nowalkbox[i].x, level.nowalkbox[i].y, level.nowalkbox[i].width, level.nowalkbox[i].height);
	//Draw endpoint
	context.fillStyle = "orange";
	for(i = 0; i < level.endpoint.length; i++) context.fillRect(level.endpoint[i].x, level.endpoint[i].y, level.endpoint[i].width, level.endpoint[i].height);
	//Draw startpoint (safe area)
	context.fillStyle = "yellow";
	for(i = 0; i < level.startpoint.length; i++) context.fillRect(level.startpoint[i].x, level.startpoint[i].y, level.startpoint[i].width, level.startpoint[i].height);
	//Draw outline among canvas
	context.strokeRect(0,0,canvas.width, canvas.height-20);
	//Draw enemies
	context.fillStyle = "blue";
	for(i = 0; i < level.enemies.length; i++) context.fillRect(level.enemies[i].x, level.enemies[i].y, level.enemies[i].width, level.enemies[i].height);
	//Draw player
	context.fillStyle = "black";
	context.fillRect(player.x, player.y, player.width, player.height);
};

//*************************
//Main loop
//*************************
var main = function() {
	var now = Date.now();
	var delta = now - then;
	update(delta / 1000);
	render();
	then = now;
	requestAnimationFrame(main);
};

// Cross-browser support for requestAnimationFrame
var w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;
var then = Date.now();
loadLevel("levels/"+ levelIndex.toString() + ".json"); // Load initial level
reset();
main();

	