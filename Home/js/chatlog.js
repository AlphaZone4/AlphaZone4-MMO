define(["jquery", "keyboard"], function($, keyboard) {
	// setup chat box
	var chat_box = $("<div>").addClass("chat_box").appendTo($("body"));
	chat_box.append("<div class='chat_box_top'>");
	
	var chat_log = $("<div>").addClass("chat_log").appendTo(chat_box);
	
	chat_box.append("<div class='chat_box_bottom'>");
	var chat_input = $("<div>").addClass("chat_input").appendTo(chat_box);
	
	var is_typing = false;
	function _is_typing(){ return is_typing; }
	
	var chat_message = "";
	
	var history = [];
	var history_max = 120;
	
	var msg_hooks = [];
	
	// symbols used when pushing shift key and number (euch, other region keyboard....... ah well)
	var chat_num_symbols = [')', '!', '"', '�', '$', '%', '^', '&', '*', '('];
	
	// caught symbols and their "shift partners" (and manual keycode definitions)
	var chat_symbols = {
		',': {k: 188, s:'<'},
		'.': {k: 190, s:'>'},
		'/': {k: 191, s:'?'},
		';': {k: 186, s:':'},
		'\'': {k: 192, s:'@'},
		'#': {k: 222, s:'~'},
		'[': {k: 219, s:'{'},
		']': {k: 221, s:'}'},
		'-': {k: 189, s:'_'},
		'=': {k: 187, s:'+'}
	};
	
	function write(message) {
		// trim message
		message = $.trim(message);
		if (!message) return;
		
		if (history.length >= history_max) history.shift();
	
		history.push(message);
		
		redraw();
	}
	
	function redraw() {
		var h = "";
		var ii;
		for(ii=0; ii<history.length; ii++) {
			h += "<p>"+emoji.replace_colons(history[ii])+"</p>";
		}
		
		chat_log.html(h);
		
		var height = chat_log[0].scrollHeight;
		chat_log.scrollTop(height);
	}
	
	function show_input() {
		chat_input.html("&nbsp;").show();
	}
	
	function hide_input() {
		chat_input.hide();
	}
	
	function chat_input_handler(code) {
		// don't bother with any of this if we're not chatting
		if (!is_typing) return;
	
		var key;
		if (code >= 65 && code <= 90) {
			// handle letter/capital input
			key = String.fromCharCode(code);
			
			if (!keyboard.pressed(16)) {
				key = key.toLowerCase();
			}
		} else if (code >= 48 && code <= 57) {
			// handle numeric/symbol inputs
			key = code - 48;
			
			if (keyboard.pressed(16)) {
				key = chat_num_symbols[key];
			}
		} else if (code == 32) {
			// special case for the space... in ur face.
			key = " ";
		} else {
			// handle special symbols
			key = String.fromCharCode(code);
			
			var o = chat_symbols[ key ];
			
			// we have custom overrides for keyboard codes (numpad hell)
			if (!o) {
				var found;
				for(var ii in chat_symbols) {
					if (chat_symbols[ ii ].k == code) {
						found = ii;
						continue;
					}
				}
				
				if (!found) return;
				
				key = found;
				o = chat_symbols[ found ];
			}
			
			if (keyboard.pressed(16)) {
				key = o.s;
			}
		}
		
		chat_message += key;
		
		chat_input.text(chat_message);
	}
	
	function add_hook(func) {
		msg_hooks.push(func);
	}
	
	keyboard.assign(13, function() {
		if (!is_typing) {
			// open chat message box
			is_typing = true;
			
			// blank chat buffer
			chat_message = "";
			
			show_input();
		} else {
			// send chat message (safely)
            chat_message = chat_message.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');
            
            if (chat_message.length) {
            
    			write("<strong>YOU</strong>: "+$('<div/>').text(chat_message).html());
    			
    			// run chat hooks
    			var ii;
    			for(ii=0; ii<msg_hooks.length; ii++) {
    				msg_hooks[ii](chat_message);
    			}
                
            }
			
			is_typing = false;
			
			hide_input();
		}
	});
	
	// handle backspace
	keyboard.always(8, function(code, event) {
		// stop backspace from moving back a page! (only when we're typing)
		if (is_typing) {
			event.keyCode = 0;
			event.returnValue = false;
			
			// take off last character from message
			if (chat_message.length) {
				chat_message = chat_message.substring(0, chat_message.length - 1);
				
				chat_input.text(chat_message);
			}
		}
	});
	
	// hooks for numbers, letters, space etc.
	var ii;
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
	for(ii=0; ii<chars.length; ii++) {
		keyboard.always(chars.charCodeAt(ii), chat_input_handler);
	}
	
	for(ii in chat_symbols) {
		var code = ii.charCodeAt(0);
		keyboard.always(ii.charCodeAt(0), chat_input_handler);
		
		if (code != chat_symbols[ ii ].k) {
			keyboard.always(chat_symbols[ ii ].k, chat_input_handler);
		}
	}
	
	// welcome message
	write("Welcome! Press <b>&lt;Enter&gt;</b> to type messages to other players.");
	write("Press <b>i</b> to change wardrobe.");
	write("Click <a href='http://www.emoji-cheat-sheet.com/' target='_blank'>here</a> for emoji list");
	write("Login to AlphaZone4 to get your username above your character!");
	
	return {
		log: write,
		is_typing: _is_typing,
		hook: add_hook
	};
});