define(function() {
	var debug = true;

	function log(msg) {
		if (debug) console.log(msg);
	}
	
	return log;
});