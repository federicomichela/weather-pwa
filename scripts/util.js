var loadJSON = function(filepath, callback) {   

    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', filepath, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            var jsonResponse = JSON.parse(xobj.responseText);
        	  	callback(jsonResponse);
          }
    };
    xobj.send(null);  
}

function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (this.readyState == 4 && this.status == 200){
        		console.log(xmlHttp.responseText);
        		callback(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send();
};

var getIPInfos = function(callback) {
	var url = 'http://freegeoip.net/json/';
	var response = JSON.parse(httpGet(url));
	return response;
}