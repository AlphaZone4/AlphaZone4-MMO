define(function() {
	var keys = {};
    var hooks = {};
	var all_hooks = {};
	
	document.onkeydown = function(event) {
		var key = (event || window.event).keyCode;
		
        // only do this once!
        if (!keys[ key ]) {
            keys[ key ] = true;
            
            if (hooks[ key ]) {
                for(var ii=0; ii<hooks[ key ].length; ii++) {
                    hooks[ key ][ ii ](key, event);
                }
            }
        }
		
		// do this whenever the browser reports the key press
		if (all_hooks[ key ]) {
			for(var ii=0; ii<all_hooks[ key ].length; ii++) {
				all_hooks[ key ][ ii ](key, event);
			}
		}
	};
	
	document.onkeyup = function(event) {
		var key = (event || window.event).keyCode;
		
		keys[ key ] = false;
	};
	
	window.onblur= function() {
		keys = {};
	};
	
	function is_pressed(key) {
		return keys[ key ] ? true : false;
	}
    
    // add new hook when a key is pressed (but only trigger once!)
    function assign(keycode, func) {
        if (!hooks[ keycode ]) hooks[ keycode ] = [];
        
        hooks[ keycode ].push(func);
    }
	
	// hooks triggered on every single key press reported by browser
	function always(keycode, func) {
		if (!all_hooks[ keycode ]) all_hooks[ keycode ] = [];
        
        all_hooks[ keycode ].push(func);
	}
	
	return {
        pressed: is_pressed,
        assign: assign,
		always: always
    };
});
