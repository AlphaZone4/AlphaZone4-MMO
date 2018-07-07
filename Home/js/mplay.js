define(["Player", "debug", "maps", "chatlog", "wardrobe"], function(Player, d, maps, chatlog, wardrobe) {
	// multiplayer lib!
	var socket;
	var localPlayer;
	var remotePlayers = [];
	var cb;
	
	function init(_cb) {
		cb = _cb;
	
		// connect to server
		//socket = io("http://" + window.location.hostname, {port: window.location.port, transports: ["websocket", "xhr-polling"]});
		socket = io({
			transports: ["websocket", "xhr-polling"]
		});
		
		// event listeners
		socket.on("connect", onSocketConnected);
		socket.on("disconnect", onSocketDisconnect);
		socket.on("new player", onNewPlayer);
		socket.on("move player", onMovePlayer);
		socket.on("remove player", onRemovePlayer);
		socket.on("change map", onMapChange);
		socket.on("change clothes", onChangeClothes);
		socket.on("chat", onChat);
		
		socket.on("error", function(excuse) {
			console.error(excuse);
		});
	}
	
	function onSocketConnected() {
		localPlayer = new Player(-10000, -10000);
		if (cb) cb();
	}

	function onSocketDisconnect() {
		// hide map
		maps.loading(true, function() {
			// remove all player objects
			var pl = get_players();
			for(var ii=0; ii<pl.length; ii++) {
				pl[ii].remove();
			}
			
			// blank list of remote players
			remotePlayers = [];
			
			// completely remove the localplayer
			delete localPlayer;
		});
	}
	
	var clone = (function(){
		return function(obj) {Clone.prototype=obj; return new Clone() }; function Clone(){}
	}());
	
	function onMapChange(data) {
		// remove all current players in room
		var pl = get_remote_players();
		// first remove graphics objects
		for(var ii=0; ii<pl.length; ii++) {
			pl[ii].remove();
		}
		// remove from list of current remote players
		remotePlayers = [];
		
		// stop player control until they've navigated
		localPlayer.control(false);
		
		// load new room
		maps.load(data.room, function(d) {
			// move player to new position
			localPlayer.setX(data.x);
			localPlayer.setY(data.y);
			localPlayer.setDir(data.dir);
			localPlayer.setSkin(data.skin);
            localPlayer.setName(data.name);
			localPlayer.redraw();
			
			wardrobe.update(data.wardrobe);
			
            maps.center(localPlayer.getX()*32, localPlayer.getY()*32);
            
			// re-enable player control in half a second
			setTimeout(function() {
				localPlayer.control(true);
			}, 500);
		});
	}

	function onNewPlayer(data) {
		// create new player object
		var newPlayer = new Player(data.x, data.y, data.skin);
		
		// set basic player object data
		newPlayer.id = data.id;
		newPlayer.setName(data.name);
		newPlayer.setDir(data.dir);
		
		// add player to array of remote players
		remotePlayers.push(newPlayer);
	}

	function onMovePlayer(data) {
		var mover = playerById(data.id);
		
		if (!mover) {
			d("Error - No such player "+data.id);
			return;
		}
		
		// resync player if there have been significant sync issues
		if ( (Math.abs(mover.getX() - data.x) + Math.abs(mover.getY() - data.y)) > 3 ) {
			mover.setX(data.x);
			mover.setY(data.y);
            //mover.setDir(data.dir);
		} else {
			// don't send walking data if we weren't accurate, as they're now in the right spot
			mover.move(data.dir, data.x, data.y);
		}
	}
	
	// hook into chat log to get typed messages
	chatlog.hook(send_chat);
	function send_chat(message) {
		socket.emit("chat", {message: message});
	}
	
	function onChat(data) {
		var p = playerById(data.id);
		
		if (!p) {
			console.log("Chatting player not found: "+data.id);
			return;
		}
		
		var msg = $('<div/>').text(data.name+": "+data.message).html();
		
		chatlog.log(msg);
	}

	function onRemovePlayer(data) {
		var removePlayer = playerById(data.id);

		if (!removePlayer) {
			console.log("Player not found: "+data.id);
			return;
		}
		
		removePlayer.remove();

		remotePlayers.splice(remotePlayers.indexOf(removePlayer), 1);
	}
	
	function playerById(id) {
		var i;
		for (i = 0; i < remotePlayers.length; i++) {
			if (remotePlayers[i].id == id)
				return remotePlayers[i];
		}

		return false;
	}
	
	function get_players() {
		return remotePlayers.concat([localPlayer]);
	}
	
	function get_remote_players() {
		return remotePlayers;
	}
	
	function player() {
		return localPlayer;
	}
	
	function move(dir) {
		// if move was successful, send move signal to server
		if (localPlayer.move(dir)) {
			socket.emit("move player", {
				dir: dir,
				x: localPlayer.getTargetX(),
				y: localPlayer.getTargetY()
			});
		}
	}
	
	// handle wardrobe changes
	wardrobe.on_change(function(outfit) {
		localPlayer.setSkin(outfit);
		localPlayer.redraw();
		
		socket.emit("change clothes", outfit);
	});
	
	function onChangeClothes(data) {
		var pl = playerById(data.id);

		if (!pl) {
			console.log("Player not found: "+data.id);
			return;
		}
		
		pl.setSkin(data.skin);
		pl.redraw();
	}

	// return mplay exportables
	return {
		init: init,
		get_players: get_players,
        get_remote_players: get_remote_players,
		player: player,
		move_player: move,
		chat: send_chat
	};
});
