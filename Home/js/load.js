require(["jquery", "mplay", "game"], function($, mplay, game) {
	// load jQuery properly before starting!
    $(function() {
		mplay.init(function() {
			game.init();
		});
    });
});
