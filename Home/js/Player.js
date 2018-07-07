define(["sprite", "maps"], function(sprite, maps) {
	return function(startX, startY, char_id) {
		var id;
		var x = startX,
			y = startY,
			targetX = startX,
			targetY = startY,
			lastX = -1000,
			lastY = -1000,
			moving = false,
			move_allow = true
			name = "",
			wardrobe = {};
		
		if (!char_id) char_id = {
			base: 0,
			hair: 0
		};
		
		var dir = 1;
		
		var step = 1; // set to 1 so it causes a single step draw on load
		var counter = 0;
		var moveTimer = 0;
        var q = [];
        var moveInterval; // timer to jump players to their final positions after a while (network chaos)
		
		var el = $("<span>").prependTo(maps.body).css("left", -10).addClass("player");
		var el_sprite = $("<span>").addClass("sprite").appendTo(el);
        
        // fade player in to be pretty
        el.delay(400).fadeIn(1200);
		
		sprite.load(char_id, el_sprite);
	
		el_sprite.click(function() {
			console.log(":D");
		});
		
		var setName = function(_name) {
			name = _name;
			// TODO - allow name to update over time
			el.append($("<p>").addClass("name").text(name).css("z-index", 10000));
		};
		
		var getName = function() {
			return name;
		}
		
		var getX = function() {
			return x;
		};

		var getY = function() {
			return y;
		};

		var setX = function(newX) {
            q = [];
			x = newX;
			lastX = x;
			targetX = x;
		};

		var setY = function(newY) {
            q = [];
			y = newY;
			lastY = y;
			targetY = y;
		};
		
		var setDir = function(_dir) {
			dir = _dir;
			redraw();
		};
		
		var getSkin = function() { return char_id; };
        
        // change player's skin (give full data object)
		var setSkin = function(skin) {
            // store new skin
            char_id = skin;
            
            // load new sprite sheet
            sprite.load(char_id, el_sprite, function() {
                // once loaded, redraw player
                redraw();
            });
        };
		
		var move = function(_dir, _x, _y) {
			// just do nothing if this character's controls are disabled
			if (!move_allow) return;
		
            // if we're already moving, add move to queue (i.e, latency on network)
            if (moving) {
                // if we've been passed target co-ordinates too, push these
                if (typeof _y != "undefined") {
                    // if you've been away waaaay too long, start shifting the first items of the array
                    if (q.length > 10) q.shift();
                    
                    q.push({
                        dir: _dir,
                        x: _x,
                        y: _y
                    });
                }
                return;
            }
            
            // if we have strayed, correct position
            if ( (Math.abs(x - _x) + Math.abs(y - _y)) > 1 ) {
                x = _x;
                y = _y;
                
                // since the stored co-ordinates are the target, set the current x,y to the previous position (yes, shut up, it's not very neat)
                if (_dir === 0) x -= 1;
                if (_dir == 1) y -= 1;
                if (_dir == 2) x += 1;
                if (_dir == 3) y += 1;
            }
            
			var newTX = x;
			var newTY = y;
			
			if (_dir === 0) newTX += 1;
			if (_dir == 1) newTY += 1;
			if (_dir == 2) newTX -= 1;
			if (_dir == 3) newTY -= 1;
			
			if (maps.can_i(newTX, newTY, _dir)) {
				targetX = newTX;
				targetY = newTY;
				
				dir = _dir;
				
				moveTimer = 1;
				moving = true;
                
                // after a few seconds, jump player to final queue position (helps with network lag when draw isn't being run)
                if (moveInterval) clearTimeout(moveInterval);
                moveInterval = setTimeout(function() {
                    if (q.length) {
                        var t = q.pop();
                        setX(t.x);
                        setY(t.y);
                        setDir(t.dir);
                        q = [];
                    } else {
                        setX(targetX);
                        setY(targetY);
                    }
                }, 3000);
                
				return true;
			} else if (dir != _dir) {
				// move didn't work, but our direction has changed
				dir = _dir;
				
				redraw();
				
				return true;
			}
			// move unsuccessful, return false
			return false;
		};
		
		var draw = function(time) {
            if (!moving && q.length) {
                var d = q.shift();
                
                move(d.dir);
            }
            
			if (moving) {
				counter += time;
				
				if (counter >= 90) {
					counter = 0;
					step += 1;
					
					// step is one, as our first frame is the player stationary
					if (step > sprite.step_length) step = 1;
				}
				
				// shift along
				var speed = time / 500;
				
				if (dir === 0) x += speed;
				if (dir == 1) y += speed;
				if (dir == 2) x -= speed;
				if (dir == 3) y -= speed;
				
				moveTimer -= speed;
				
				if (!moveTimer || moveTimer <= 0) {
					// made it!
					x = targetX;
					y = targetY;
					moving = false;
                    
                    // clear timeout if it exists
                    if (moveInterval) clearTimeout(moveInterval);
				}
				
				redraw();
                
                return true;
			} else if(step) {
				step = 0;
				counter = 0;
				
				redraw();
                
                return false;
			}
		};
		
		var redraw = function() {
			// calculate current character sprite position
			var off = sprite.chara_step(char_id, dir, step);
			
			// update character sprite location
			el_sprite.css("background-position", "-"+off.x+"px -"+off.y+"px");
			el.css("z-index", y);
			
			// move main character element
			el.css("left", (x * 32)-16).css("top", ((y-1) * 32)-5);
		};
		
		var remove = function() {
			el.remove();
		};
		
		var is_moving = function() {
			return moving;
		};
		
		var getTargetX = function() {
			return targetX;
		};
		
		var getTargetY = function() {
			return targetY;
		};
		
		// allow player control?
		var control = function(tf) {
			move_allow = tf;
		};
		
		var setWardrobe = function(a) {
			wardrobe = a;
		};
		
		var getWardrobe = function() {
			return wardrobe;
		};
		
		redraw();
		
		return {
			getX: getX,
			getY: getY,
			setX: setX,
			setY: setY,
			getTargetX: getTargetX,
			getTargetY: getTargetY,
			getSkin: getSkin,
			setSkin: setSkin,
			setDir: setDir,
			setName: setName,
			getName: getName,
			move: move,
			draw: draw,
			redraw: redraw,
			remove: remove,
			is_moving: is_moving,
			id: id,
			control: control,
			can_move: function() { return move_allow; },
			getWardrobe: getWardrobe,
			setWardrobe: setWardrobe
		};
	};
});
