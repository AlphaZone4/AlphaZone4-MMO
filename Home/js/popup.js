define(function() {
	function create(body, cb) {
		// create clickable background element
		var background = $("<div>").addClass("popup_back");
		
		// main popup holder
		var popup_holder = $("<div>").addClass("popup");
		
		popup_holder.append("<div class='popup_top'></div>");
		
		// popup content placed into this div
		var popup = $("<div class='popup_content'></div>");
		popup_holder.append(popup);
		
		popup_holder.append("<div class='popup_bottom'></div>");
		
		popup.html(body);
		
		var closer = function() {
			popup_holder.fadeOut(250);
			background.fadeOut(300, function() {
				// remove popup elements
				popup_holder.remove();
				background.remove();
				
				// callback if supplied
				if (cb) cb();
			});
		};
		
		// clicking background closes the popup
		background.click(closer);
		
		$("body").append(popup_holder).append(background);
		
		// return object representing popup
		return {
			remove: closer,
			body: popup
		}
	}
	
	return create;
});