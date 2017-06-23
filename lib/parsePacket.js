
/**
 * Parse RFLink packet
 *
 * @param packet : RFLink packet according to RFLink specification
 */
function parsePacket(packet) {
	var parts = packet.split(";");
    var parsedPacket = {
        rflink_id: null,
		sensor_id: null,
		name_id: null,
		device_id: null,
        rfdata: {}
    };
					
	// Process RFLink
	parsedPacket.rflink_id = parts[0];
	parsedPacket.sensor_id = parts[1];
	parsedPacket.name_id = (parts[2].toLowerCase().replace(/ /g,"_")).replace(/\//g,"_"); //lowercase, replace spaces and slashes
	parsedPacket.device_id = parts[3].split("=")[1];
	
	if(parts.length <= 5 ){
		return;
	}
	
	if(parsedPacket.rflink_id == 10){
		return;
	}
		
	for(var i = 4; i < (parts.length)-1;i++)
	{
		// we don't use split() method since values can have '=' in it
		idx = parts[i].indexOf("=");
		name = (parts[i].substring(0, idx)).toLowerCase();
		value = parts[i].substring(idx + 1, parts[i].length);			

        if (name != "") {          

            switch (name) {
                case "switch": parsedPacket.rfdata.switch = value; break;
                case "cmd": parsedPacket.rfdata.cmd = value; break;
                case "set_level": parsedPacket.rfdata.set_level = parseInt(value, 10); break;
                case "temp": parsedPacket.rfdata.temp = _parseTemperature(value); break;
                case "hum": parsedPacket.rfdata.hum = parseInt(value, 10).toString(); break;
                case "baro": parsedPacket.rfdata.baro = parseInt(value, 16); break;
                case "hstatus": parsedPacket.rfdata.hstatus = parseInt(value, 10); break;
                case "bforecast": parsedPacket.rfdata.bforecast = parseInt(value, 10); break;
                case "uv": parsedPacket.rfdata.uv = parseInt(value, 16); break;
                case "lux": parsedPacket.rfdata.lux = parseInt(value, 16); break;
                case "bat": parsedPacket.rfdata.bat = value; break;
                case "rain": parsedPacket.rfdata.rain = parseInt(value, 16) / 10; break;
                case "rainrate": parsedPacket.rfdata.rainrate = parseInt(value, 16) / 10; break;
				case "raintot": parsedPacket.rfdata.raintot = parseInt(value, 16) / 10; break;
                case "winsp": parsedPacket.rfdata.winsp = parseInt(value, 16) / 10; break;
                case "awinsp": parsedPacket.rfdata.awinsp = parseInt(value, 16) / 10; break;
                case "wings": parsedPacket.rfdata.wings = parseInt(value, 16); break;
				case "wdir": parsedPacket.rfdata.wdir = parseInt(value) * 22.5; break;
                case "windir": parsedPacket.rfdata.windir = parseInt(value) * 22.5; break;
                case "winchl": parsedPacket.rfdata.winchl = _parseTemperature(value);; break;
                case "wintmp": parsedPacket.rfdata.wintmp = _parseTemperature(value);; break;
                case "chime": parsedPacket.rfdata.chime = parseInt(value, 10); break;
                case "smokealert": parsedPacket.rfdata.smokealert = value; break;
                case "pir": parsedPacket.rfdata.pir = value; break;
                case "co2": parsedPacket.rfdata.co2 = parseInt(value, 10); break;
                case "sound": parsedPacket.rfdata.sound = parseInt(value, 10); break;
                case "kwatt": parsedPacket.rfdata.kwatt = parseInt(value, 16); break;
                case "watt": parsedPacket.rfdata.watt = parseInt(value, 16); break;
                case "current": parsedPacket.rfdata.current = parseInt(value, 10); break;
                case "current2": parsedPacket.rfdata.current2 = parseInt(value, 10); break;
                case "current3": parsedPacket.rfdata.current3 = parseInt(value, 10); break;
                case "dist": parsedPacket.rfdata.dist = parseInt(value, 10); break;
                case "meter": parsedPacket.rfdata.meter = parseInt(value, 10); break;
                case "volt": parsedPacket.rfdata.volt = parseInt(value, 10); break;
                case "rgbw": parsedPacket.rfdata.rgbw = parseInt(value.substring(2, 4), 16); break;
				
                default: console.error('Unable to parse line: ' + name); break;
            }
        }
    }

	parsedPacket.rfdata.timestamp = new Date().toISOString();	
	//console.log(parsedPacket);
    return parsedPacket;
}


/**
 * Parse temperature
 *
 * @param timestamp : 
 */
function _parseTemperature(temp) {
	
	var result = parseInt(temp, 16);
		if(result >= 32768){
			result = 32768 - result;
		}
		
		var parsedTemperature = (result / 10.0).toString();

    return parsedTemperature;
}


module.exports = parsePacket;