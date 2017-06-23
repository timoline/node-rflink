var parsePacket = require('./lib/parsePacket');	
var sp = require('serialport'); 
var mqtt = require('mqtt');
var readline = require('readline');
var fs = require('fs');
var express = require('express');
var app = express();
var config = require('./config.json');

var mclient,
	sclient,
    config,
    SerialPort,
	command;

function SendToRFLink(command) {	
	console.log('Send to RFLink: ' + command);
	sclient.write(command + "\r\n");
}	

function getRFLinkCommand (topic,message){
	
	//10;Protocol Name;device address,button number;action; 

	// actions/rflink/MiLightv1/F746/01/34BC PAIR
	var rflink_id = "10;";	
	var split = topic.split("/");
	//console.log("topic length: " + split.length);
	if ((split.length) == 2){
		// for receiving version, ping/pong, reboot //2
		// actions/flink version
		// actions/flink ping
		// actions/flink reboot
		if(message == "version" || message == "ping" || message == "reboot")
		{
			command = rflink_id + message + ";" ;
			console.log("Received from mqtt, topic: " + topic);
			console.log("Received from mqtt, message: " + message);
			console.log("Command 4: " + command);
			
			return command;		
		}
		else
		{
			console.log("Message/command is not correct: " + message);
		}
	}		
	else if ((split.length) == 4){
		// actions/rflink/MERTIK/64 UP;	//4		
		command = rflink_id + split[2] + ";" + split[3] + ";" + message + ";" ;
		console.log("Received from mqtt, topic: " + topic);
		console.log("Received from mqtt, message: " + message);
		console.log("Command 4: " + command);
		
		return command;		
	}	
	else if ((split.length) == 5){
		// actions/rflink/Kaku/00004d/1 OFF //5		
		command = rflink_id + split[2] + ";" + split[3] + ";" + split[4] + ";" + message + ";" ;
		console.log("Received from mqtt, topic: " + topic);
		console.log("Received from mqtt, message: " + message);
		console.log("Command 5: " + command);
		
		return command;		
	}
	else if ((split.length) == 6){
		// actions/rflink/NewKaku/00c142/1/AAA ON //6		
		command = rflink_id + split[2] + ";" + split[3] + ";" + split[4] + ";" + split[5] + ";" + message + ";" ;
		console.log("Received from mqtt, topic: " + topic);
		console.log("Received from mqtt, message: " + message);
		console.log("Command 6: " + command);
		
		return command;		
	}	
	else {
		console.log("Topic lenght is not correct: " + topic);
	}	
		

}

//***** MQTT	
mclient = mqtt.connect(config.mqtt_broker, config.mqtt_port, config.mqtt_options); 
mclient.publish('connected/' + config.app_name , '1');

var connected;
mclient.on('connect', function () {
    connected = true;
    console.log('mqtt connected ' + config.mqtt_broker);
	
	mclient.subscribe(config.mqtt_torflinktopic);
});

mclient.on('close', function () {
    if (connected) {
        connected = false;
        console.log('mqtt closed ' + config.mqtt_broker);
    }
});

mclient.on('error', function () {
    console.error('mqtt error ' + config.mqtt_broker);
});

mclient.on('message', function (topic, message) {
	command = getRFLinkCommand (topic,message);
	if(command)
	{
		SendToRFLink(command);		
	}

});

/* **** WEBSERVER
app.use(express.static(__dirname + '/public'));
app.get('/index.html', function (req, res) {
	res.sendFile( __dirname + "/" + "index.html" );
})

app.listen(config.web_port, function() {
	console.log('server listening on port ' + config.web_port);
});	

var jsondata = {};
app.get('/json', function(req,res) { 
	app.set('json spaces', 2);
	res.json(jsondata);
});
*/
/*
var rawdata = {};
app.get('/raw', function(req,res) { 
	res.send(rawdata);
});
*/
//*****

function publishData(data){	
	if(data){
		if(data.rfdata.switch){
			var RFTopic = config.mqtt_topic + data.name_id + '/' + data.device_id + '/' + data.rfdata.switch + '/';		
		}
		else{
			var RFTopic = config.mqtt_topic + data.name_id + '/' + data.device_id + '/';
		}
		
		for(var key in data.rfdata)
		{		
			//console.log("DATA",data.rfdata[key]);	
			mclient.publish(RFTopic + key, data.rfdata[key], {retain: true});
		}
	}		
}


function main() {
     	
	if(config.serial_port === "TEST"){
		var lineReader = readline.createInterface({
		  input: fs.createReadStream('rflink.log')
		});
		
		lineReader.on('line', function (line) {
			console.log('Received: ' + line);
			parsePacket(line);
		});
	}
	else
	{	
		SerialPort = sp.SerialPort;

		sclient = new SerialPort(config.serial_port, {
			baudrate: 57600,
			databits: 8,
			parity: 'none',
			stopBits: 1,
			flowControl: false,		
			parser: sp.parsers.readline('\n')
		});
				
		sclient.on('data', function(line) {
			console.log('Received from serial: ' + line);
			//console.log(line.length);

			publishData(parsePacket(line));

		});
		
	}	
	
}
main();