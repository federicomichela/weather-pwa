/* util for string formatting */
if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) {
			return typeof(args[number]) != 'undefined' ? args[number] : match;
    });
  };
}

/* 3rd parties endpoints */
var FREE_GEO_IP_URL = 'http://freegeoip.net/json/';
var WATHER_FORECAST_URL = 'http://api.openweathermap.org/data/2.5/weather?APPID={0}&units=metric&&lat={1}&lon={2}';


/* util to get an api response. Returns: Promise */
var getResponse = function(url, options) {
	return new Promise(function(resolve, reject) {
		var request = new Request(url);

		fetch(request).then(response => {
			if (response.status === 200) {
				resolve(response.json());
			} else {
				reject(new Error("AJAX request failed!"));
			}
		});
	});
};
