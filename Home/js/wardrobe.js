define(["sprite", "popup"], function(sprite, popup) {
	var data = {};
	
	var hooks = [];
	
	var p;
	
	function change_hooks(hook) {
		hooks.push(hook);
	}

	function editor(player) {
		var wardrobe = $("<div>");
		
		var ii;
		var pieces = [];
		for(ii in data) {
			var t = piece(ii, data[ii], player[ii]);
			pieces.push(t);
			
			wardrobe.append(t.div);
		}
		
		wardrobe.append("<div style='clear:both'></div>");
		
		$("<i class='butt'>Submit</i>").click(function() {
			var save = {};
			for(ii = 0; ii<pieces.length; ii++) {
				save[ pieces[ii].type() ] = pieces[ii].id();
			}
			
			console.log(save);
			
			for(ii=0; ii<hooks.length; ii++) {
				hooks[ii](save);
			}
			
			if (p) p.remove();
		}).appendTo(wardrobe);
		
		return wardrobe;
	}
	
	function piece(type, options, current) {
		var t = $("<div style='width: 140px; height: 90px; text-align: center; float: left'>");
		
		var left = $("<i class='arrowleft' style='float:left'></i>");
		var right = $("<i class='arrowright' style='float:right'></i>");
		
		var ii;
		
		left.click(function() {
			if (offset === 0) return;
			
			offset -= 1;
			o.id(options[ offset ]);
			
			if (offset === 0) {
				left.addClass("arrowdisable");
			} else {
				left.removeClass("arrowdisable");
			}
			right.removeClass("arrowdisable");
		});
		
		right.click(function() {
			if (offset === (options.length-1)) return;
			
			offset += 1;
			o.id(options[ offset ]);
			
			if (offset === (options.length-1)) {
				right.addClass("arrowdisable");
			} else {
				right.removeClass("arrowdisable");
			}
			left.removeClass("arrowdisable");
		});
		
		t.append(left).append(right);
		
		t.append("<p>"+type+"</p>");
		
		var o = sprite.wardrobe_object(type);
		
		var offset = 0;
		for(ii=0; ii<options.length; ii++) {
			if (options[ii] == current) offset = ii;
		}
		
		if (offset === 0) left.addClass("arrowdisable");
		if (offset === (options.length-1)) right.addClass("arrowdisable");
		
		o.id(options[ offset ]);
		t.append(o.div);
		
		return {
			div: t,
			type: function() {return type;},
			id: function() {return options[ offset ];}
		};
	}
	
	function popup_editor(player, cb) {
		p = popup(editor(player), function() {
			p = null;
			
			if (cb) cb();
		});
	}
	
	return {
		editor: editor,
		popup: popup_editor,
		update: function(a) {data = a;},
		on_change: change_hooks
	};
});