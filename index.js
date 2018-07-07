// Node.JS "multiplayer server"
var util = require("util"),
    io = require("socket.io"),
	Player = require("./Player").Player,
	rooms = require("./rooms"),
	connect = require("connect"),
	serveStatic = require('serve-static'),
    auth    = require("./auth");

var socket,
    players;

var room_players = {};

var default_room = "Home";

var player_names = [
	"Billeh",
	"Milleh",
	"Cubeh",
	"Renneh",
	"Toneh",
	"Silleh",
];

var port = process.env.PORT || process.env.VMC_APP_PORT || 1337;
	
function init() {
	rooms.init(function() {
		console.log("Loaded "+rooms.count()+" rooms");
        
        // serve Home folder as static files
        var app = connect().use(serveStatic('Home/')).listen(port);
		
		players = [];
		
		socket = io.listen(app);
		
		/*socket.configure(function() {
			//socket.set("transports", ["websocket", "xhr-polling"]);
			socket.set("transports", ["xhr-polling"]);
			socket.set("log level", 2);
		});*/
		
		socket.sockets.on("connection", onSocketConnection);
	});
};

function onSocketConnection(client) {
    var cookie;
    
	// no cookies? no game.
	if (client.handshake.headers && client.handshake.headers.cookie) {
    	// build cookie object
    	var cookies = {};
    	var split = client.handshake.headers.cookie.split(";");
    	for(var ii=0; ii<split.length; ii++) {
    		var t = split[ii].split("=");
    		if (t && t[1]) {
                // trim key name
                t[0] = t[0].replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');
    			cookies[ t[0] ] = t[1];
    		}
    	}
        
        cookie = cookies['wordpress_logged_in_7ec7adbc21f9cf6a3d3caa088e002252'];
	}
    
    auth.validateCookie(cookie, function(player_login) {
        // login failed!
        if (!player_login) {
            return;
        }
        
        var name = player_login.user_login;
        if (name == "Anon") {
            name += "_" + Math.round(Math.random() * 900);
        }
        
        // optional, handle anonymous players
        // if (!player_login.ID)
        
    	// setup event handlers for this socket connection
        util.log("New player has connected: "+client.id);
    	
    	// create player object
    	var newPlayer = new Player();
    	newPlayer.setID(client.id);
    	newPlayer.data.name = name;
    
    	// add new player to global player array
    	players.push(newPlayer);
        
    	// place player in default room
    	change_map(client, default_room, 5, 5);
        
        client.on("disconnect", onClientDisconnect);
        //client.on("new player", onNewPlayer);
        client.on("move player", onMovePlayer);
        client.on("chat", onChat);
        client.on("change clothes", onChangeClothes);
    });
};

function change_map(client, map, x, y, dir) {
	
	// store current room (if exists)
	var old_room = client.map;
	
	// if this player already exists, remove from their old room
	if (old_room) {
		for(var ii=0; ii<room_players[ old_room ].length; ii++) {
			if (room_players[ old_room ][ ii ].data.id == client.id) {
				room_players[ old_room ].splice(ii, 1);
			}
		}
		
		client.broadcast.to(old_room).emit("remove player", {id: client.id});
		client.leave(old_room);
	}
	
	var player = playerById(client.id);
	if (!player) {
		util.log("Player not found: "+client.id);
		return;
	}
	
	util.log("Placing " + player.data.name + " in room " + map);

	// update player object with his new co-ordinates
	player.data.x = x;
	player.data.y = y;
	
	if (dir) {
		player.data.dir = dir;
	}
	
	// tell client which map to load
	client.emit("change map", {
		room: map,
		x: x,
		y: y,
		dir: player.data.dir,
		skin: player.data.skin,
		wardrobe: player.data.wardrobe,
        name: player.data.name
	});
	
	// set map parameter on object for future reference
	client.map = map;
	
	// create this room array if it doesn't already exist
	if (!room_players[ client.map ]) room_players[ client.map ] = [];
	
	// tell players in this room about the new player that just joined
	client.broadcast.to(client.map).emit('new player', player.data);
	
	// tell new player about all the players already in the room
	for (var i = 0; i < room_players[ client.map ].length; i++) {
		client.emit("new player", room_players[ client.map ][i].data);
	}
	
	// place client in the correct socket.IO room
    client.join(map);
	
	// push this player into the new room array
	room_players[ client.map ].push(player);
}

function onClientDisconnect() {
    util.log("Player has disconnected: "+this.id);
	
	// find player object
	var removePlayer = playerById(this.id);
	if (!removePlayer) {
		util.log("Player not found: "+this.id);
		return;
	}

	// remove player from global player array
	players.splice(players.indexOf(removePlayer), 1);
	
	// remove player from their current room
    room_players[ this.map ].splice(room_players[ this.map ].indexOf(removePlayer), 1);
	
	// tell players in their room they have no left
	this.broadcast.to(this.map).emit("remove player", {id: this.id});
};

/*function onNewPlayer(data) {
	var newPlayer = new Player(data.x, data.y);
	newPlayer.setID(this.id);
	newPlayer.data.skin = data.skin;
	
	if (!room_players[ this.map ]) room_players[ this.map ] = [];
	
	//this.broadcast.emit("new player", newPlayer.data);
	this.broadcast.to(this.map).emit('new player', newPlayer.data)
	
	// only fetch players in this room
	for (var i = 0; i < room_players[ this.map ].length; i++) {
		this.emit("new player", room_players[ this.map ][i].data);
	}
	
	// list of all players
	players.push(newPlayer);
	// list of players in this room
	room_players[ this.map ].push(newPlayer);
};*/

function onMovePlayer(data) {
	var movePlayer = playerById(this.id);

	if (!movePlayer) {
		util.log("Player not found: "+this.id);
		return;
	}
	
	// check player can walk here, otherwise don't bother sending to other players
	if (!rooms.walk_check(this.map, data.x, data.y, data.dir)) {
		return;
	}

	movePlayer.move(data.dir);
	movePlayer.data.x = data.x;
	movePlayer.data.y = data.y;

	// send new direction (and target X,Y - used for recovering from chaos)
	//this.broadcast.emit("move player", {id: movePlayer.data.id, x: movePlayer.data.x, y: movePlayer.data.y, dir: movePlayer.data.dir});
	this.broadcast.to(this.map).emit("move player", {id: movePlayer.data.id, x: movePlayer.data.x, y: movePlayer.data.y, dir: movePlayer.data.dir});
	
	// check if the player has entered a warp point, but after player moves
	var t = rooms.warp_check(this.map, data.x, data.y);
	if (t) {
		// do warp!
		change_map(this, t.map, t.x, t.y, t.dir);
	}
};

function onChat(data) {
	var p = playerById(this.id);

	if (!p) {
		util.log("Player not found: "+this.id);
		return;
	}
    
    util.log("> "+this.map+"> "+p.data.name+": "+data.message);

	this.broadcast.to(this.map).emit("chat", {id: p.data.id, name: p.data.name, message: data.message});
};

function onChangeClothes(data) {
	var p = playerById(this.id);

	if (!p) {
		util.log("Player not found: "+this.id);
		return;
	}
	
	p.data.skin = data;
	
	this.broadcast.to(this.map).emit("change clothes", {id: p.data.id, skin: p.data.skin});
}

function playerById(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].data.id == id)
            return players[i];
    };

    return false;
};

init();
