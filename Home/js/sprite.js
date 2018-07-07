define(["base64"], function(base64) {
	// file cache
	var file_cache = {};
	var outfit_cache = {};
	var content_offsets = {};
	
	// configure body parts we understand
	var loadables = {
		body_male: "body_male.png",
		body_female: "body_female.png",
		hair_male: "hair_male.png",
		hair_female: "hair_female.png",
		torso_male: "torso_male.png",
		head_male: "head_male.png",
		feet: "feet.png",
		legs_male: "legs_male.png"
	};
	
	var data_config = {
		pieces_across: 3, // max columns of items in any data set
		pieces_num: 12    // max items in any data set
	};
	
	// ========= Canvas rendering bit =========

	// load a player object onto an element
	// returns ID of outfit
	function load_outfit(player, el, cb) {
		// first calculate the ID
		var id = outfit_to_ID(player);
		
		if (outfit_cache[ id ]) {
			el.css("background-image", "URL(" + outfit_cache[ id ] + ")");
		} else {
			// generate canvas
			load_canvas(player, function(c) {
				// apply generated canvas to player's element
				var URI = c.toDataURL("image/png");
				console.log(URI);
				
				// cache result
				outfit_cache[ id ] = URI;
				
				el.css("background-image", "URL(" + URI + ")");
                
                if (cb) cb();
			});
		}
		
		return id;
	}
	
	// convert a player object into an ID
	function outfit_to_ID(player) {
		var res = [];
		
		// turn object into array of string=key
		for(var ii in player) {
			// make sure we actually understand this thing
			if (player[ii] != -1 && loadables[ ii ]) {
				res.push(ii + "=" + player[ii]);
			}
		}
		
		// sort list
		res.sort();
		
		return base64.encode(res.join(";"));
	}
	
	// generate a canvas sprite sheet given supplied configuration
	function load_canvas(player, cb) {
		var c = document.createElement("canvas");
		
		// set canvas to size of sprite sheet
		c.width = chara_conf.width * chara_conf.cells_x;
		c.height = chara_conf.height * chara_conf.cells_y;
		
		var canvas = c.getContext("2d");
		
		if (!player.base) player.base = 0;
		
		var list = [];
		
		for(var ii in player) {
			if (player[ii] != -1 && loadables[ ii ]) {
				var f = idToFileNum(loadables[ ii ], player[ii]);
				list.push({
					type: ii,
					file: f
				});
			}
		}
		
		fetch_content(list, function(data) {
			// write images to model
			// - do in order of loadables object
			for(var ii in loadables) {
				if (data[ ii ]) {
					// find data offset
					var off = content_offset(player[ data[ ii ].type ] % data_config.pieces_num);
					
					// draw onto our canvas!
					canvas.drawImage(data[ ii ].img,
						off.x, off.y,
						chara_conf.chara_width, chara_conf.chara_height,
						0, 0,
						chara_conf.chara_width, chara_conf.chara_height
					);
				}
			}
			
			cb(c);
		});
	}
	
	function fetch_content(list, cb) {
		// result object
		var res = {};
	
		// make a todo list of fetches
		var todo = list.slice(0);
		
		var preload = function() {
			var n = todo.shift();
			
			if (!n) {
				// Done!
				if (cb) return cb(res);
			} else {
				load_img(n.file, function(i) {
					// add to result object
					res[ n.type ] = {
						type: n.type,
						file: n.file,
						img: i
					};
					
					// do next step of loading
					preload();
				});
			}
		};
		
		preload();
	}
	
	// load an external image resource
	function load_img(file, cb) {
		if (file_cache[ file ]) {
			return cb(file_cache[ file ]);
		} else {
			var img = new Image();
			img.src = "avatars/" + file;
			img.onload = function() {
				file_cache[ file ] = img;
				return cb(img);
			};
		}
	}
	
	// where do we load the piece from the data file to import onto our character?
	function content_offset(id) {
		// check cache (this is gonna be called a lot...)
		if (content_offsets[ id ]) return content_offsets[ id ];
	
		var down = Math.floor( id / data_config.pieces_across );
		content_offsets[ id ] = {
			x: (id % data_config.pieces_across) * chara_conf.chara_width,
			y: ( chara_conf.chara_height ) * down
		};
		return content_offsets[ id ];
	}
	
	// ========= Animation Bit =========
	
	// character sprite configs
	var chara_conf = {
		width: 64,
		height: 64,
		cells_x: 9,
		cells_y: 4,
		dirs: [
			[27, 28, 29, 30, 31, 32, 33, 34, 35],
			[18, 19, 20, 21, 22, 23, 24, 25, 26],
			[9, 10, 11, 12, 13, 14, 15, 16, 17],
			[0, 1, 2, 3, 4, 5, 6, 7, 8]
		]
	};
	
	// pre-calculate some common data
	chara_conf.chara_width = chara_conf.width * chara_conf.cells_x;
	chara_conf.chara_height = chara_conf.height * chara_conf.cells_y;
	
	// pre-cache chara-sheet sprite offsets (look at me being efficient!)
	chara_conf.cache_dirs = [];
	for(var ii=0; ii<chara_conf.dirs.length; ii++) {
		var c = [];
		for(var jj=0; jj<chara_conf.dirs[ii].length; jj++) {
			var id = chara_conf.dirs[ii][jj];
			c.push({
				x: ( id % chara_conf.cells_x ) * chara_conf.width,
				y: chara_conf.height * Math.floor( id / chara_conf.cells_x )
			});
		}
		chara_conf.cache_dirs.push(c);
	}

	// return x,y co-ordinates of spritesheet for this direction 'dir' and step 'step'
	function chara_step(id, dir, step) {
		// check the cache for directions
		if (chara_conf.cache_dirs[ dir ] && chara_conf.cache_dirs[ dir ][ step ]) {
			var s = chara_conf.cache_dirs[ dir ][ step ];
			return {
				x: s.x,
				y: s.y
			}
		} else {
			return char_start;
		}
	}
	
	function idToFileNum(file, id) {
		var file_num = Math.floor(id / data_config.pieces_num);
		if (file_num === 0) return file;
		
		var filename = file.replace(/\..*/g,'');
		return filename+"_0"+file_num+".png";
	}
	
	// create an object for looking at clothing types
	function wardrobe_object(type) {
		if (!loadables[ type ]) return;
		
		var div = $("<div style='width: 64px; height: 64px; display: inline-block; padding-bottom: 8px'>");
		
		var current_id = 0;
		
		var set = -1;
		
		var change_id = function(id) {
			// no id passed? this is a getter
			if (typeof(id) == "undefined") return current_id;
			
			var new_set = Math.floor(id / data_config.pieces_num);
			
			// no item selected
			if (id == -1) {
				set = -1;
				div.css("background-image", "");
				return;
			}
			
			if (new_set != set) {
				// background image needs to be changed
				if (new_set === 0) {
					div.css("background-image", "URL('avatars/"+loadables[ type ]+"')");
				} else {
					var filename = loadables[ type ].replace(/\..*/g,'');
					div.css("background-image", "URL('avatars/"+filename+"_0"+new_set+".png')");
				}
				set = new_set;
			}
		
			var o = content_offset(id);
			
			div.css("background-position", "-"+o.x+"px -"+(o.y+128)+"px");
		};
		
		div.css("background-image", "URL('avatars/"+loadables[ type ]+"')");
		
		return {
			div: div,
			id: change_id
		}
	}
	
	return {
		chara_step: chara_step,
		load: load_outfit,
		step_length: chara_conf.dirs[0].length-1,
		wardrobe_object: wardrobe_object
	};
});