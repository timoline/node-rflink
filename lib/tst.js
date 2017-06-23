var parsePacket = require('./parsePacket');	
var readline = require('readline');	
var fs = require('fs');	
		
var lineReader = readline.createInterface({
  input: fs.createReadStream('rflink.log')
});

lineReader.on('line', function (line) {
	console.log('Received: ' + line);
	parsePacket(line);
});
