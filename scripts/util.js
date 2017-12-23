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
var WATHER_URL = 'http://api.openweathermap.org/data/2.5/weather?APPID={0}&units=metric&&lat={1}&lon={2}';
var FORECAST_URL = 'http://api.openweathermap.org/data/2.5/forecast?APPID={0}&units=metric&&lat={1}&lon={2}';


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


/* This objects collects informations related to the weather of a specific town.
 * Built from the response of an open api provided by the forecast service openweathermap.
 *
 * NOTES:
 * 	> weather : WeatherDetails obj (weather details for today approx current time)
 *  > forecast : [WeatherDetails] list (weather details for next 4 days approx current time)
 *
 * */
class CityForecast {
	constructor(id, latitude, longitude, name, country, currentWeather, forecast) {
		this.id = id;
		this.latitude = latitude;
		this.longitude = longitude;
		this.name = name;
		this.country = country;
		this.currentWeather = currentWeather;
		this.forecast = forecast;
	}
}

class WeatherDetails {
	constructor(dt, description, icon, currentTemperature, minTemperature, maxTemperature, humidity) {
		this.dt = dt;
		this.description = description;
		this.icon = icon;
		this.currentTemperature = currentTemperature;
		this.minTemperature = minTemperature;
		this.maxTemperature = maxTemperature;
		this.humidity = humidity;
	}
}