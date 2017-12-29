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
var FREE_GEO_IP_URL = 'https://freegeoip.net/json/';
var WATHER_URL = 'https://api.openweathermap.org/data/2.5/weather?APPID={0}&units=metric&&lat={1}&lon={2}';
var FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast?APPID={0}&units=metric&&lat={1}&lon={2}';
var GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?key=' + settings.GOOGLE_PLACES_API_KEY + '&input={0}';


/* util to get an api response. Returns: Promise */
var getResponse = function(url, authenticated) {
	return new Promise(function(resolve, reject) {
		var headers = new Headers();

		if (authenticated) {
			var user = gapi.auth2.getAuthInstance().currentUser.get();
			var oauthToken = user.getAuthResponse().access_token;
			headers.append('Authorization', 'Bearer ' + oauthToken);
		}

		var options = { headers: headers };
		console.log(options);
		var request = new Request(url, options);

		fetch(request).then(response => {
			if (response.status === 200) {
				resolve(response.json());
			} else {
				reject(new Error("AJAX request failed!\n{0}".format(response)));
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
	constructor(id, latitude, longitude, name, country, dt, currentWeather, forecast) {
		this.id = id;
		this.latitude = latitude;
		this.longitude = longitude;
		this.name = name;
		this.country = country;
		this.dt = dt;
		this.currentWeather = currentWeather;
		this.forecast = forecast;
	}
}

class WeatherDetails {
	constructor(description, icon, currentTemperature, minTemperature, maxTemperature, humidity, dt) {
		this.description = description;
		this.icon = icon;
		this.currentTemperature = currentTemperature;
		this.minTemperature = minTemperature;
		this.maxTemperature = maxTemperature;
		this.humidity = humidity;
		this.dt = dt;
	}
}