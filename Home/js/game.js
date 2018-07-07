define(["mplay", "stats.min", "keyboard", "maps", "jquery", "chatlog", "wardrobe"], function(mplay, stats_min, keyboard, maps, $, chatlog, wardrobe) {
	// shim layer with setTimeout fallback
	window.requestAnimFrame = (function() {
		return  window.requestAnimationFrame || 
		window.webkitRequestAnimationFrame   || 
		window.mozRequestAnimationFrame      || 
		window.oRequestAnimationFrame        || 
		window.msRequestAnimationFrame       || 
		function( callback ) {
			window.setTimeout(callback, 1000 / 60);
		};
	})();
	
	var running = true;
	
	var last_time = 0;
	
	var player;
	
	function init() {
		player = mplay.player();
		
		setup_keys();
		
		var stats = new Stats();
		stats.setMode(0); // 0: fps, 1: ms

		// Align top-left
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.left = '0px';
		stats.domElement.style.top = '0px';

		document.body.appendChild( stats.domElement );
		
		(function animloop(time){
			stats.begin();
			
			requestAnimFrame(animloop);
			
			if (running) render(time - last_time);
			
			last_time = time;
			
			stats.end();
		})();
	}
    
    function setup_keys() {
        keyboard.assign(68, function() {
            if (!chatlog.is_typing()) console.log(player.getX()+", "+player.getY());
        });
		
		keyboard.assign(73, function() {
			// if player can't move, disallow wardrobe
			if (!player.can_move()) return;
			
			// don't open wardrobe whenever player types i in chat log
			if (chatlog.is_typing()) return;
			
			// stop player from moving etc.
			player.control(false);
			wardrobe.popup(player.getSkin(), function() {
				// re-enable player controls
				player.control(true);
			});
		});
		
		// stop firefox moving window around with arrow keys
		var stop_scroll = function(k, e) {
			e.preventDefault();
		};
		keyboard.always(37, stop_scroll);
		keyboard.always(38, stop_scroll);
		keyboard.always(39, stop_scroll);
		keyboard.always(40, stop_scroll);
        
        // when window resizes, ensure the map is centered correctly
        window.onresize=function() {
            maps.center(player.getX()*32, player.getY()*32);
        };
    }
	
	function render(time) {
		// check keyboard controls if we're currently not moving
		if (player.can_move() && !player.is_moving() && !chatlog.is_typing()) {
			if (keyboard.pressed(39)) {
				mplay.move_player(0);
			} else if (keyboard.pressed(38)) {
				mplay.move_player(3);
			} else if (keyboard.pressed(40)) {
				mplay.move_player(1);
			} else if (keyboard.pressed(37)) {
				mplay.move_player(2);
			}
		}
        
        // draw local player
        var tmp = player.draw(time);
        if (tmp) {
            // if player moved this frame draw
            // consider moving the map container
            maps.center(player.getX()*32, player.getY()*32);
        }
		
		// draw all players
		var pl = mplay.get_remote_players();
		if (!pl.length) return;
		
		for(var ii=0; ii<pl.length; ii++) {
			pl[ii].draw(time);
		}
	}
	
	return {
		init: init
	};
});
