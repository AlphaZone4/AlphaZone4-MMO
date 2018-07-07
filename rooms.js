// Room manager
var fs 			= require("fs"),
    requirejs 	= require("requirejs"),
	map_load    = requirejs("./Home/js/map_data.js");

var maps = {};
var maps_num = 0;

var map_dir = "./Home/maps/";

var specials = {
	solid: function(map, tile) {
	},
	warp: function(map, tile) {
		// we have a warp!!!
	},
};

function load_room(file, cb) {
	// get map ID
	var room_id = file.replace(/\.json/g, "");	
	if (!room_id) return;

	// load map data file
	var data = require(map_dir+file);
	
	// load map object and process data (collisions etc.) using client code base
	map_load.load(room_id, data, function(map_data) {
		// store map data in server memory
		maps[ room_id ] = map_data;
		
		maps_num += 1;
		
		if (cb) cb();
	});
}

var map_regex = /\.json$/;
function init(cb) {
	// load maps from map folder
	fs.readdir(map_dir, function(e, files) {
		if (e) console.log(e);
		
		var todo = [];
		
		for(var ii=0; ii<files.length; ii++) {
			if (map_regex.test(files[ ii ])) {
				
				// push to queue
				todo.push(files[ ii ]);
			}
		}
		
		var step = function() {
			var n = todo.shift();
			
			if (!n) {
				if (cb) cb();
			} else {
				console.log("Loading "+n+" Room file");
				
				load_room(n, function() {
					step();
				});
			}
		};
		
		step();
	});
}

function walk_check(map, x, y, dir) {
	return map_load.can_walk(maps[map], x, y, dir);
}

function warp_check(map, x, y) {
	if (maps[map].warps[y] && maps[map].warps[y][x]) {
		return maps[map].warps[y][x];
	}
	return false;
}

module.exports = {
	init: init,
	count: function() {return maps_num;},
	maps: maps,
	walk_check: walk_check,
	warp_check: warp_check,
};
