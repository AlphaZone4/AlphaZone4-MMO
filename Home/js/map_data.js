define(function() {
	// all maps must have these settings, otherwise it's invalid
	var map_require = {
		orientation: "orthogonal",
		tileheight: 32,
		tilewidth: 32
	};
	
	// map memory
	var maps = {};
	
	// special tile functions
	var specials = {
		solid: function(ii, tile, map) {
			// calculate this tile's x and y position
            var x = (ii % map.width);
            var y = Math.floor( ii / map.width );
			
			// if this map position doesn't exist yet, make it
			if (!map.walls[y]) map.walls[y] = [];
			
			// store solid tile
			map.walls[y][x] = (tile.prop.solid=="true")?1:tile.prop.solid;
        },
		// warp point tile
		warp: function(ii, tile, map) {
			// calculate this tile's x and y position
            var x = (ii % map.width);
            var y = Math.floor( ii / map.width );
			
			// search for configured map warp point
			if (map.properties[ "warp_" + tile.prop.warp ]) {
				var t = map.properties[ "warp_" + tile.prop.warp ].split("_");
				
				if (!map.warps[y]) map.warps[y] = [];
				
				var ret = {
					map: t[0],
					x:   parseInt(t[1]),
					y:   parseInt(t[2])
				};
				
				// optional new character direction
				if (t[3]) {
					ret.dir = parseInt(t[3])
				}
				
				map.warps[y][x] = ret;
			}
		}
	};

	// pass a JSON object to this function to load the map data
	function load_map_from_data(id, data, cb) {
		// store raw data as basic map info
		maps[ id ] = data;
		
		// store map id inside map
		maps[ id ].id = id;
		
		// create empty structures
		maps[ id ].walls = [];
		maps[ id ].warps = [];
        
        maps[ id ].actual_width = maps[ id ].width * 32;
        maps[ id ].actual_height = maps[ id ].height * 32;
	
		// check some basic attributes
		var ii, jj;
		for(ii in map_require) {
			if (data[ ii ] != map_require[ ii ]) {
				return cb(false);
			}
		}
		
		// no data? :(
		if (!data.tilesets) return cb(false);
		
		var fetch_tiles = [];
		for(ii = 0; ii < data.tilesets.length; ii++) {
			fetch_tiles.push(data.tilesets[ ii ]);
		}
		
		load_tilesets(fetch_tiles, function(map_data) {
			// save calculated map data
			for(ii in map_data) {
				maps[ id ][ ii ] = map_data[ ii ];
			}
			
			// calculate any special tiles by looping through layers
			var kk;
			for(ii = 0; ii < maps[ id ].layers.length; ii++) {
				var l = maps[ id ].layers[ ii ].data;
				for(jj = 0; jj < l.length; jj++) {
					if (l[ jj ]) {
						// find tile for this part of map
						var tile = maps[ id ].tiles[ l[ jj ] ];
						
						// check for any special functions to apply
						for(kk in tile.prop) {
							if (specials[ kk ]) {
								specials[ kk ](jj, tile, maps[ id ]);
							}
						}
					}
				}
			}
			
			// return new map data
			return cb(maps[ id ]);
		});
	}
	
	function load_tilesets(list, cb) {
		var ii;
		
		// empty objects to return
		var tiles = {};
		var sheets = [];
	
		// make a todo list of fetches
		var todo = list.slice(0);
		
		var step = function() {
			var n = todo.shift();
			
			if (!n) {
				// Done!
				if (cb) return cb({
					tiles: tiles,
					sheets: sheets
				});
			} else {
                // only fetch this sheet if not hidden
                if (!n.properties.hidden) {
					sheets.push(n.image);
				}
				
                load_tileset(n, function(res) {
					// merge results into existing tile object
					for(ii in res) {
						tiles[ ii ] = res[ ii ];
					}
					
					// do next tileset
					step();
				});
			}
		};
		
		step();
	}
	
	function load_tileset(tileset, cb) {
		var tiles = {};
	
		// check if this tileset is visible or not
		var hidden;
		if (tileset.properties.hidden) {
			hidden = true;
		} else {
			hidden = false;
		}
		
		// count number of cells in this sheet
		var cells_x = Math.floor(tileset.imagewidth / tileset.tilewidth);
		var cells_y = Math.floor(tileset.imageheight / tileset.tileheight);
		var cells_num = cells_x * cells_y;
		var lastgid = tileset.firstgid + cells_num;
		
		// add tiles from this sheet to memory
		var ii, jj = 0;
		for(ii = tileset.firstgid; ii < lastgid; ii++) {
			tiles[ ii ] = {
				file: tileset.image,
				x	: (jj % cells_x) * tileset.tilewidth,
				y	: Math.floor( jj / cells_x ) * tileset.tileheight,
				w	: tileset.tilewidth,
				h	: tileset.tileheight,
				display: !hidden
			};
			
			// add any special data properties for this tile
			if (tileset.tileproperties && tileset.tileproperties[ jj ]) {
				tiles[ ii ].prop = tileset.tileproperties[ jj ];
			} else {
				tiles[ ii ].prop = {};
			}
			
			
			
			jj++;
		}
		
		if (cb) cb(tiles);
	}
	
	function can_walk(map, x, y, dir) {
		// cannot walk off map
		if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
		
		// work out previous x,y from direction
		var px = x, py = y;
		if (dir === 0) px -= 1;
		if (dir == 1) py -= 1;
		if (dir == 2) px += 1;
		if (dir == 3) py += 1;
		
		// check for special collision types
		if (map.walls[py] && map.walls[py][px]) {
			// half solid walls are the direction number + 1
			//  ie. dir 0 = solid: 1
			if (map.walls[py][px] == (dir + 2) ) return false;
		}
		
		if (map.walls[y] && map.walls[y][x]) {
			// normal solid block
			if (map.walls[y][x] == 1) return false;
			
			// stop user walking into half walls directly
			if (dir === 0 && map.walls[y][x] == 4) return false;
			if (dir === 1 && map.walls[y][x] == 5) return false;
			if (dir === 2 && map.walls[y][x] == 2) return false;
			if (dir === 3 && map.walls[y][x] == 3) return false;
		}
		return true;
	}
	
	return {
		load: load_map_from_data,
		can_walk: can_walk
	};
});