define(["jquery", "map_data"], function($, map_data) {
	// hold reference to current map data
	var current_map;
	
	// memory cache of tileset images
	var file_cache = {};
	
	// jQuery containers for map and layers
	var container = $("<div id='container'>").appendTo($("body"));
	var layer_holder = $("<div id='layers'>").appendTo(container);
	var loading_screen = $("<div id='loading_screen'>").appendTo(container);
    
	// debug flag. Enable to draw collision, warp-tiles etc.
    var draw_special = false;
	
	// load (and switch to) given map
	function load(map, cb) {
		// fade loading screen in
		loading(true, function() {
			// clear current layers
			layer_holder.html("");
		
			// basename map (stop arbitrary loading)
			map = map.replace(/\\/g,'/').replace( /.*\//, "");
			
			// fetch map object
			$.getJSON("../maps/"+map+".json", function(d) {
				// load into memory properly and calculate data set
				map_data.load(map, d, function(o) {
					if (!o) {
						return alert("Failed to parse map");
					}
					
					// save current map
					current_map = o;
					
					// fetch required sheets before rendering
					var list = current_map.sheets.slice(0);
					
					var step = function() {
						var n = list.shift();
						
						if (!n) {
							// render map!
							render_map();
							
							// remove loading screen and return
							// fade in first so the callback has time to do whatever
							loading(false);
							
							if (cb) cb(o);
						} else {
							// pre-fetch tileset image
							load_img(n, function() {
								step();
							});
						}
					};
					
					// start fetching sheets
					step();
				});
			}).error(function() {
				alert("Error Loading Map. :'(");
			});
		});
	}
	
	// enable/disable loading screen. Optional callback
	function loading(tf, cb) {
		if (tf) {
			loading_screen.fadeIn(400, function() {
				if (cb) cb();
			});
		} else {
			loading_screen.fadeOut(400, function() {
				if (cb) cb();
			});
		}
	}
	
	function render_map() {
		// == Now we have the tiles loaded, render the layers ==
		if (!current_map.layers) return false;
	
		var layers = [];
		
        var ii;
		// build array of layers to render
		for(ii = 0; ii < current_map.layers.length; ii++) {
			layers.push({
				data: current_map.layers[ ii ].properties ? current_map.layers[ ii ].properties : {},
				canvas: render_layer(current_map.layers[ ii ], current_map.width, current_map.height, current_map)
			});
		}
		
		// clear the container object
		layer_holder.html("");
		
		for(ii = 0; ii<layers.length; ii++) {
			var new_layer = $("<div>").css("width", current_map.actual_width).css("height", current_map.actual_height).addClass("layer");
			new_layer.append(layers[ ii ].canvas);
			
			// layers can configure their own z-index through the "overlay" property
			if (layers[ ii ].data.overlay) {
				new_layer.css("z-index", layers[ ii ].data.overlay);
			}
			
			layer_holder.append(new_layer);
		}
		
		// resize container to hold this map
		container.css("width", current_map.actual_width).css("height", current_map.actual_height).css("margin-top", -current_map.actual_height/2).css("margin-left", -current_map.actual_width/2);
	}
    
    function center_map(x, y) {
        if (!current_map) return;
        
        if (typeof(x) == "undefined") {
            container.css("margin-top", -current_map.actual_height/2).css("margin-left", -current_map.actual_width/2);
            return;
        }
        
        var wide = (window.innerWidth < current_map.actual_width);
        var tall = (window.innerHeight < current_map.actual_height);
        
        var half_view_width = window.innerWidth / 2;
        var half_view_height = window.innerHeight / 2;
        
        var leeway;
        
        if (wide) {
            // sort out x positioning
            leeway = current_map.actual_width - window.innerWidth;
            
            if (x < ( (current_map.actual_width - leeway) / 2 )) {
                // player is close to map left, just render at side of screen
                container.css("margin-left", - half_view_width);
            } else if (x > ( (current_map.actual_width + leeway) / 2 )) {
                container.css("margin-left", half_view_width - current_map.actual_width);
            } else {
                container.css("margin-left", -x);
            }
        } else {
            container.css("margin-left", -current_map.actual_width/2);
        }
        
        if (tall) {
            // sort out y positioning
            leeway = current_map.actual_height - window.innerHeight;
            
            if (y < ( (current_map.actual_height - leeway) / 2 )) {
                // player is close to map top, just render at top of screen
                container.css("margin-top", -half_view_height);
            } else if (y > ( (current_map.actual_height + leeway) / 2 )) {
                container.css("margin-top", half_view_height - current_map.actual_height);
            } else {
                container.css("margin-top", -y);
            }
        } else {
            container.css("margin-top", -current_map.actual_height/2);
        }
    }
	
	function render_layer(l, width, height, o) {
		var ii;
	
		// create new canvas
		var c = document.createElement("canvas");
		
		// set canvas to size of sprite sheet
		c.width = width * 32;
		c.height = height * 32;
		
		var canvas = c.getContext("2d");
		
		for (ii = 0; ii < l.data.length; ii++) {
			// draw each tile to the canvas
			if (l.data[ ii ]) {
				var tile = current_map.tiles[ l.data[ ii ] ];
                
                // don't draw if this is an invisible tile!
                if (tile.display || draw_special) {
                    canvas.drawImage(file_cache[ tile.file ],
                        tile.x, tile.y,
                        tile.w, tile.h,
                        (ii % width) * 32, Math.floor( ii / width ) * 32,
                        32, 32
                    );
                }
			}
		}
		
		return c;
	}
	
	function load_img(file, cb) {
		if (file_cache[ file ]) {
			return cb(file_cache[ file ]);
		} else {
			var img = new Image();
			img.src = "maps/" + file;
			img.onload = function() {
				file_cache[ file ] = img;
				return cb(img);
			};
		}
	}
	
	// check for wall collisions when walking
	function can_i(x, y, dir) {
		// pass onto map data object
		return map_data.can_walk(current_map, x, y, dir);
	}
	
	return {
		load: load,
		can_i: can_i,
		body: container,
		loading: loading,
        center: center_map
	};
});
