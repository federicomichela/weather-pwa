var isModule = typeof module !== "undefined" && module.exports;

if (isModule) {
	http = require('http');
	URL = require('url');
}

var Weather = {Utils: {}};

Weather.VERSION = "0.0.3";

var jsonp = Weather.Utils.jsonp = function (uri, callback){
	return new Promise(function(resolve, reject){
		var id = '_' + Math.round(10000 * Math.random());
		var callbackName = 'jsonp_callback_' + id;
		var el = (document.getElementsByTagName('head')[0] || document.body || document.documentElement);
		var script = document.createElement('script');
		var src = uri + '&callback=' + callbackName;

		window[callbackName] = function(data){
			delete window[callbackName];
			var ele = document.getElementById(id);
			ele.parentNode.removeChild(ele);
			resolve(data);
		};

		script.src = src;
		script.id = id;
		script.addEventListener('error', reject);
		el.appendChild(script);
	} );
};

Weather.setApiKey = function (apiKey) {
	Weather.APIKEY = apiKey;
};

Weather.getApiKey = function () {
	return Weather.APIKEY;
};

Weather.kelvinToFahrenheit = function (value) {
	return (this.kelvinToCelsius(value) * 1.8) + 32;
};

Weather.kelvinToCelsius = function (value) {
	return value - 273.15;
};

Weather.getForecast = function (cityID) {
	var url = "http://api.openweathermap.org/data/2.5/forecast?id=" + encodeURIComponent(cityID);
	// define days
	url += '&cnt=7';
	// define units [kelvin by default; metric (celsius); imperial (fahrenheit)
	url += '&units=metric';
	
	/* TODO: supported locales:
	 * Arabic - ar, Bulgarian - bg, Catalan - ca, Czech - cz, German - de, Greek - el,
	 * English - en, Persian (Farsi) - fa, Finnish - fi, French - fr, Galician - gl, Croatian - hr,
	 * Hungarian - hu, Italian - it, Japanese - ja, Korean - kr, Latvian - la, Lithuanian - lt,
	 * Macedonian - mk, Dutch - nl, Polish - pl, Portuguese - pt, Romanian - ro, Russian - ru, Swedish - se,
	 * Slovak - sk, Slovenian - sl, Spanish - es, Turkish - tr, Ukrainian - ua, Vietnamese - vi,
	 * Chinese Simplified - zh_cn, Chinese Traditional - zh_tw.
	 * */
//	url += '&lang=' + locale;

	if (Weather.APIKEY) {
		url = url + "&APPID=" + Weather.APIKEY;
	} else {
		console.log('WARNING: You must set an apiKey for openweathermap');
	}

	return JSON.parse(httpGet(url));
};

Weather._getJSON = function( url, callback ) {
	if (isModule) {
		return http.get(URL.parse(url), function(response) {
			return callback(response.body);
		} );
	} else {
		jsonp(url).then(callback);
	}
};

var maxBy = Weather.Utils.maxBy = function (list, iterator) {
	var max;
	var f = function (memo, d) {
		var val = iterator(d);

		if (memo === null || val > max) {
			max = val;
			memo = d;
		}

		return memo;
	};

	return list.reduce(f, null);
};

var minBy = Weather.Utils.minBy = function (list, iterator) {
	var min;
	var f = function (memo, d) {
		var val = iterator(d);

		if (memo === null || val < min) {
			min = val;
			memo = d;
		}

		return memo;
	};

	return list.reduce(f, null);
};

var isOnDate = Weather.Utils.isOnDate = function (a, b) {
	var sameYear = a.getYear() === b.getYear();
	var sameMonth = a.getMonth() === b.getMonth();
	var sameDate = a.getDate() === b.getDate();

	return sameYear && sameMonth && sameDate;
};

Weather.Forecast = function (data) {
	this.data = data;
};

Weather.Forecast.prototype.startAt = function () {
	return new Date(minBy(this.data.list, function (d) { return d.dt; }).dt * 1000);
};

Weather.Forecast.prototype.endAt = function () {
	return new Date(maxBy(this.data.list, function (d) { return d.dt; }).dt * 1000);
};

Weather.Forecast.prototype.day = function (date) {
	return new Weather.Forecast(this._filter(date));
};

Weather.Forecast.prototype.low = function () {
	if (this.data.list.length === 0) return;

	var output = minBy(this.data.list, function (item) {
		return item.main.temp_min;
	} );

	return output.main.temp_min;
};

Weather.Forecast.prototype.high = function () {
	if (this.data.list.length === 0) return;

	var output = maxBy( this.data.list, function (item) {
		return item.main.temp_max;
	} );

	return output.main.temp_max;
};

Weather.Forecast.prototype._filter = function (date) {
	return {
		list: this.data.list.filter(function (range) {
			var dateTimestamp = (range.dt * 1000);

			if (isOnDate(new Date(dateTimestamp), date)) {
				return range;
			}
		})
	};
};

Weather.Current = function (data) {
	this.data = data;
};

Weather.Current.prototype.temperature = function () {
	return this.data.list[0].main.temp;
};

Weather.Current.prototype.conditions = function () {
	return this.data.list[0].weather[0].description;
};

if (isModule) { module.exports = Weather; }
else { window.Weather = Weather; }
