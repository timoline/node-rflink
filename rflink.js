"use strict";
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
    RFLink,
	command;

function SendToRFLink(command) {	
	console.log('Send to RFLink: ' + command);
	sclient.write(command + "\r\n");
}	

function getRFLinkCommand (topic,message){
	
	//10;Protocol Name;device address,button number;action; 

	// actions/rflink/MiLightv1/F746/01/34BC PAIR
	var rflink_id = "10;";	
	var tp = topic.split("/");
	//console.log("topic length: " + tp.length);
	if ((tp.length) == 2){
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
	else if ((tp.length) == 4){
		// actions/rflink/MERTIK/64 UP;	//4		
		command = rflink_id + tp[2] + ";" + tp[3] + ";" + message + ";" ;
		console.log("Received from mqtt, topic: " + topic);
		console.log("Received from mqtt, message: " + message);
		console.log("Command 4: " + command);
		
		return command;		
	}	
	else if ((tp.length) == 5){
		// actions/rflink/Kaku/00004d/1 OFF //5		
		command = rflink_id + tp[2] + ";" + tp[3] + ";" + tp[4] + ";" + message + ";" ;
		console.log("Received from mqtt, topic: " + topic);
		console.log("Received from mqtt, message: " + message);
		console.log("Command 5: " + command);
		
		return command;		
	}
	else if ((tp.length) == 6){
		// actions/rflink/NewKaku/00c142/1/AAA ON //6		
		command = rflink_id + tp[2] + ";" + tp[3] + ";" + tp[4] + ";" + tp[5] + ";" + message + ";" ;
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
mclient.publish('connected/' + config.app_name , '1', {retain: true});

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

//***** WEBSERVER
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

/*
var rawdata = {};
app.get('/raw', function(req,res) { 
	res.send(rawdata);
});
*/
//*****

function RFLink() {
	/*
	this.timestamp = 0;
	this.rflink_id = 0;
	this.sensor_id = 0;
	this.name_id = 0;
	this.device_id = 0;
	this.rfdata = 0;
	*/
}

RFLink.prototype.update = function(data) {
	var key;
	jsondata = data;	
	if(config.mqtt_sendhistorical){
		mclient.publish(config.mqtt_historicaltopic, JSON.stringify(data));
		console.log("Sending historical data to mqtt...");
		console.log(data);
	}
	
	// if the device has a switch use the switch id for an unique topic, this is needed for retained messages
	if(data.rfdata.switch){
		var RFTopic = config.mqtt_topic + data.name_id + '/' + data.device_id + '/' + data.rfdata.switch + '/';		
	}
	else{
		var RFTopic = config.mqtt_topic + data.name_id + '/' + data.device_id + '/';
	}
	
	for(key in data.rfdata)
	{		
		//console.log(key);
		mclient.publish(RFTopic + key, data.rfdata[key], {retain: true});
	}

};

function processData(telegram) {
    var timestamp,
		rflink_id,
		sensor_id,
		name_id,
		device_id,
		rfdata = {},
		result,
		idx,
		name,
		value;
	
    if(telegram.length > 0) {
		
		var tg = telegram.split(";");
        
		rfdata.timestamp = Math.round(new Date().getTime()/1000).toString();				
		// Process RFLink
		rflink_id = tg[0];
		sensor_id = tg[1];
		name_id = (tg[2].toLowerCase().replace(/ /g,"_")).replace(/\//g,"_"); //lowercase, replace spaces and slashes
		//device_id =  tg[3].substr(3);
		device_id = tg[3].split("=")[1];
		
		if (name_id.includes("nodo_radiofrequencylink") )
		{
			console.log('Start message, getting RFLink version...');	
			command = "10;VERSION;";
			SendToRFLink (command);				
		}		
		
		if (name_id.includes("ver") ) // 20;3C;VER=1.1;REV=37;BUILD=01;
		{
			// version info	
		}		

		for(var i = 4; i < (tg.length)-1;i++)
		{
			/*
			var arr = tg[i].split("=");
			
			for(var a=0 ; a < (arr.length) ; a+=2) 
			{
				rfdata[ arr[a].toLowerCase() ] = arr[a+1];
			}			
			*/
			// we don't use split() method since values can have '=' in it
            idx = tg[i].indexOf("=");
            name = (tg[i].substring(0, idx)).toLowerCase();
            value = tg[i].substring(idx + 1, tg[i].length);			
			rfdata[ name ] = value;
		}
		//console.log(rfdata);
		
		for(var y in rfdata)
		{	
			if (y === "switch")
			{
				result = rfdata[y];
				rfdata[y] = result.toString();						
			}	
			else if (y === "cmd") // ON/OFF/ALLON/ALLOFF
			{		
				result = rfdata[y];
				rfdata[y] = result.toString();	  
			}			
			else if (y === "set_level") // 1-100 %
			{
				result = Math.round(parseInt(rfdata[y]) * 99 / 15) + 1	;
				rfdata[y] = result.toString();					
			}
			else if (y === "temp") // celcius
			{
				result = parseInt(rfdata[y], 16);
				if(result >= 32768){
					result = 32768 - result;
				}
				
				rfdata[y] = (result / 10.0).toString();
			}
			else if (y === "hum") // 0-100 %
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();						
			}
			else if (y === "baro")
			{
				result = parseInt(rfdata[y], 16);
				rfdata[y] = result.toString();						
			}		
			else if (y === "hstatus") // 0=Normal, 1=Comfortable, 2=Dry, 3=Wet
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();						
			}
			else if (y === "bforecast") // 0=No Info/Unknown, 1=Sunny, 2=Partly Cloudy, 3=Cloudy, 4=Rain
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}		
			else if (y === "uv")
			{
				result = parseInt(rfdata[y], 16) /10.0;
				rfdata[y] = result.toString();						
			}	
			else if (y === "lux")
			{
				result = parseInt(rfdata[y], 16);
				rfdata[y] = result.toString();						
			}
			else if (y === "bat") // OK/LOW
			{
				result = rfdata[y];
				rfdata[y] = result.toString();						
			}
			else if (y === "rain") // mm
			{
				result = parseInt(rfdata[y], 16) /10.0;
				rfdata[y] = result.toString();					
			}	
			else if (y === "raintot") // mm 
			{
				result = parseInt(rfdata[y], 16);
				rfdata[y] = result.toString();					
			}										
			else if (y === "winsp") // km. p/h
			{
				result = parseInt(rfdata[y], 16) /10.0;
				rfdata[y] = result.toString();						
			}	
			else if (y === "awinsp") // km. p/h
			{
				result = parseInt(rfdata[y], 16) /10.0;
				rfdata[y] = result.toString();						
			}					
			else if (y === "wings") // km. p/h
			{
				result = parseInt(rfdata[y], 16);
				rfdata[y] = result.toString();						
			}	
			else if (y === "windir") // 0-360 degrees in 22.5 degree steps
			{
				result = parseInt(rfdata[y]) *22.5;
				rfdata[y] = result.toString();						
			}
			else if (y === "winchl")
			{
				result = parseInt(rfdata[y], 16);
				if(result >= 32768){
					result = 32768 - result;
				}
				
				rfdata[y] = (result / 10.0).toString();						
			}	
			else if (y === "wintmp")
			{
				result = parseInt(rfdata[y], 16);
				if(result >= 32768){
					result = 32768 - result;
				}
				
				rfdata[y] = (result / 10.0).toString();						
			}	
			else if (y === "chime")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}	
			else if (y === "smokealert") // ON/OFF
			{
				result = rfdata[y];
				rfdata[y] = result.toString();						
			}		
			else if (y === "pir") // ON/OFF
			{
				result = rfdata[y];
				rfdata[y] = result.toString();						
			}	
			else if (y === "co2")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}
			else if (y === "sound")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}
			else if (y === "kwatt")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}
			else if (y === "watt")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}
			else if (y === "dist")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}
			else if (y === "meter")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}
			else if (y === "volt")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}
			else if (y === "current")
			{
				result = parseInt(rfdata[y]);
				rfdata[y] = result.toString();
			}				
		}  	

		//console.log(rfdata);
		
		//only accept RFLink->Master messages
		if (rflink_id == 20)
		{	
			if (name_id.includes("nodo_radiofrequencylink"))
			{	
				// version info
				console.log('Received: Start message');		
			}
			else if (name_id.includes("ver"))
			{
				// version info
				// 20;15;VER=1.1;REV=42;BUILD=0a;
				console.log('Received: Version info');	
			}			
			else if (name_id.includes("ok"))
			{
				// message received
				console.log('Received: ok message');	
			}
			else if (name_id.includes("pong"))
			{
				// ping received
				console.log('Received: pong');	
			}
			else if (name_id.includes("cmd_unkknown"))
			{
				// unkknown command received
				console.log('Received: Unkknown command');	
			}
			else
			{
				RFLink.update({
					rflink_id: rflink_id,
					sensor_id: sensor_id,
					name_id: name_id,
					device_id: device_id,
					rfdata
				});
			}	
		}
		else
		{
			console.log('rflink_id is not 20, skip sending to mqtt...');
		}
		
    } else {
        console.log('Invalid number of lines in telegram (' + telegram.length + ')');
    }
}

function main() {
     
    var telegram = [];
    console.log('Starting rflink');
	
	if(config.serial_port === "TEST"){
		var lineReader = readline.createInterface({
		  input: fs.createReadStream('rflink.log')
		});
		RFLink = new RFLink();
		lineReader.on('line', function (line) {
			//console.log('Received: ' + line);
			processData(line);
		});
	}
	else
	{	
		SerialPort = sp;
		RFLink = new RFLink();

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
			//console.log(line[0]);
			telegram = line;
			//rawdata = telegram;
			if(line[0] === "2") {
				processData(telegram);
				//telegram.length = 0;
			} else {
				telegram.push(line);
			}
		});
		
	}	
	
}
main();
