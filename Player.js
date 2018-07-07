var Player = function(startX, startY) {
	if (!startX) startX = 0;
	if (!startY) startY = 0;

	// default character packet
	var data = {
		x: startX,
		y: startY,
		dir: 1,
		skin: {
			body_male: 2,
			feet: -1,
			legs_male: 1,
			torso_male: 5,
			hair_male: 63,
			head_male: -1,
		},
		// default wardrobe list
		wardrobe: {
			body_male: [0, 1, 2, 3, 4, 5, 6],
			hair_male: [],
			torso_male: [-1, 0, 1, 2, 3, 4, 5],
			legs_male: [-1, 0, 1, 2, 3, 4],
			feet: [-1, 0, 2, 4, 6, 8, 10],
			head_male: [-1, 1, 2, 3, 4, 5, 6, 7],
		}
	};
	
	// populate hair choices
	for(var ii=0; ii<80; ii++) {
		data.wardrobe.hair_male.push(ii);
	}
	
	function setID(_id) {
		data.id = _id;
	};
    
    var move = function(newDir) {
		data.dir = newDir;
		
		if (data.dir == 0) data.x += 1;
		if (data.dir == 1) data.y += 1;
		if (data.dir == 2) data.x -= 1;
		if (data.dir == 3) data.y -= 1;
	};

    return {
		data: data,
        move: move,
        setID: setID
    }
};

exports.Player = Player;
