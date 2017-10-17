(function() {
	'use strict';

	// check if browser supports indexDB
	if (!'indexedDB' in window) {
		console.error('This browser doesn NOT support IndexedDB');
		return;
	}

	// create / open datastore and tables
	var dbPromise = null;
	var forecastObj = 'city-forecast';
	var citiesObj = 'cities';
	dbPromise = idb.open('weatherDB', 2, function(upgradeDb) {
		switch (upgradeDb.oldVersion) {
			case 0:
				// a placeholder case so that the switch block will
				// execute when the database is first created
				// (oldVersion is 0)
			case 1:
				console.log('Creating the city-forecast object store');
				upgradeDb.createObjectStore(forecastObj, {keyPath: 'key'});
			case 2:
				console.log('Creating the cities object store');
				upgradeDb.createObjectStore(citiesObj, {keyPath: 'id'});
		}
	});
	
	var injectedForecast = {
			key: 'newyork',
			label: 'New York, NY',
			currently: {
				time: 1453489481,
				summary: 'Clear',
				icon: 'partly-cloudy-day',
				temperature: 52.74,
				apparentTemperature: 74.34,
				precipProbability: 0.20,
				humidity: 0.77,
				windBearing: 125,
				windSpeed: 1.52
			},
			daily: {
				data: [
					{icon: 'clear-day', temperatureMax: 55, temperatureMin: 34},
					{icon: 'rain', temperatureMax: 55, temperatureMin: 34},
					{icon: 'snow', temperatureMax: 55, temperatureMin: 34},
					{icon: 'sleet', temperatureMax: 55, temperatureMin: 34},
					{icon: 'fog', temperatureMax: 55, temperatureMin: 34},
					{icon: 'wind', temperatureMax: 55, temperatureMin: 34},
					{icon: 'partly-cloudy-day', temperatureMax: 55, temperatureMin: 34}
					]
			}
	};

	var apiKey = 'ecefd3d2e460437978a5ad49c738ec1a';
	var weatherAPIUrlBase = 'http://api.openweathermap.org/data/2.5/forecast?APPID='+apiKey+'&q=';

	var app = {
			isLoading: true,
			visibleCards: {},
			selectedCities: [],
			spinner: document.querySelector('.loader'),
			cardTemplate: document.querySelector('.cardTemplate'),
			container: document.querySelector('.main'),
			addDialog: document.querySelector('.dialog-container'),
			daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
			
			citiesList: []
	};


	/*****************************************************************************
	 *
	 * Event listeners for UI elements
	 *
	 ****************************************************************************/

	/* Event listener for refresh button */
	document.getElementById('butRefresh').addEventListener('click', function() {
		app.updateForecasts();
	});

	/* Event listener for add new city button */
	document.getElementById('butAdd').addEventListener('click', function() {
		// Open/show the add new city dialog
		app.toggleAddDialog(true);
	});

	/* Event listener for add city button in add city dialog */
	document.getElementById('butAddCity').addEventListener('click', function() {
		var select = document.getElementById('selectCityToAdd');
		var selected = select.options[select.selectedIndex];
		var key = selected.value;
		var label = selected.textContent;
		app.getForecast(key, label);
		app.selectedCities.push({key: key, label: label});
		app.toggleAddDialog(false);
		
		app.cacheItems([{'key': key, 'label': label}], forecastObj);
	});

	/* Event listener for cancel button in add city dialog */
	document.getElementById('butAddCancel').addEventListener('click', function() {
		app.toggleAddDialog(false);
	});


	/*****************************************************************************
	 *
	 * Methods to update/refresh the UI
	 *
	 ****************************************************************************/

	// Toggles the visibility of the add new city dialog.
	app.toggleAddDialog = function(visible) {
		if (visible) {
			app.addDialog.classList.add('dialog-container--visible');
		} else {
			app.addDialog.classList.remove('dialog-container--visible');
		}
	};

	// Updates a weather card with the latest weather forecast. If the card
	// doesn't already exist, it's cloned from the template.
	app.updateForecastCard = function(data) {
		var card = app.visibleCards[data.key];
		if (!card) {
			card = app.cardTemplate.cloneNode(true);
			card.classList.remove('cardTemplate');
			card.querySelector('.location').textContent = data.label;
			card.removeAttribute('hidden');
			app.container.appendChild(card);
			app.visibleCards[data.key] = card;
		}
		card.querySelector('.description').textContent = data.currently.summary;
		card.querySelector('.date').textContent =
			new Date(data.currently.time * 1000);
		card.querySelector('.current .icon').classList.add(data.currently.icon);
		card.querySelector('.current .temperature .value').textContent =
			Math.round(data.currently.temperature);
		card.querySelector('.current .feels-like .value').textContent =
			Math.round(data.currently.apparentTemperature);
		card.querySelector('.current .precip').textContent =
			Math.round(data.currently.precipProbability * 100) + '%';
		card.querySelector('.current .humidity').textContent =
			Math.round(data.currently.humidity * 100) + '%';
		card.querySelector('.current .wind .value').textContent =
			Math.round(data.currently.windSpeed);
		card.querySelector('.current .wind .direction').textContent =
			data.currently.windBearing;
		var nextDays = card.querySelectorAll('.future .oneday');
		var today = new Date();
		today = today.getDay();
		for (var i = 0; i < 7; i++) {
			var nextDay = nextDays[i];
			var daily = data.daily.data[i];
			if (daily && nextDay) {
				nextDay.querySelector('.date').textContent =
					app.daysOfWeek[(i + today) % 7];
				nextDay.querySelector('.icon').classList.add(daily.icon);
				nextDay.querySelector('.temp-high .value').textContent =
					Math.round(daily.temperatureMax);
				nextDay.querySelector('.temp-low .value').textContent =
					Math.round(daily.temperatureMin);
			}
		}
		if (app.isLoading) {
			app.spinner.setAttribute('hidden', true);
			app.container.removeAttribute('hidden');
			app.isLoading = false;
		}
	};


	/*****************************************************************************
	 *
	 * Methods for dealing with the model
	 *
	 ****************************************************************************/

	// Gets a forecast for a specific city and update the card with the data
	app.getForecast = function(key, label) {
		var forecast = app.getForecastFromCache(key).then(function(forecast) {
			if (forecast) {
				app.updateForecastCard(forecast);
				return
			}
		});

		var city = app.getCityByName(key);
		if (!city) {
			alert('City '+key+' not found in our system. Please select a different city');
			return;
		}
		var url = weatherAPIUrlBase + city.label;
		// Make the XHR to get the data, then update the card
		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			if (request.readyState === XMLHttpRequest.DONE) {
				if (request.status === 200) {
					var response = JSON.parse(request.response);
					var cityForecast = app.normaliseAPIResponse(request.response);
					app.updateForecastCard(cityForecast);
					app.cacheItems([cityForecast], forecastObj);
				}
			}
		};
		request.open('GET', url);
		request.send();
	};

	app.normaliseAPIResponse = function(response) {
		var city = app.getCityById(response.id);
		var icon = null;
		if (response.weather.description.indexOf('clear') > -1) {
			icon = 'clear';
		}
		if (response.weather.description.indexOf('sunny') > -1) {
			icon = 'cloudy_s_sunny';
		}
		if (response.weather.description.indexOf('showers') > -1) {
			icon = 'cloudy-scattered-showers';
		}
		if (response.weather.description.indexOf('fog') > -1) {
			icon = 'fog';
		}
		if (response.weather.description.indexOf('clear') > -1) {
			icon = 'clear';
		}
		if (response.weather.description.indexOf('rain') > -1) {
			icon = 'rain';
		}
		if (response.weather.description.indexOf('snow') > -1) {
			icon = 'snow';
		}
		if (response.weather.description.indexOf('wind') > -1) {
			icon = 'wind';
		}
		if (response.weather.description.indexOf('thunderstorm') > -1) {
			icon = 'thunderstorm';
		}
		
		var cityForecast = {
			key: city.name.lower(),
			label: city.name,
			currently: {
				time: response.dt,
				summary: response.weather[response.weather.length-1].description,
				icon: icon,
				temperature: response.main.temp,
				minTemp: response.main.temp_min,
				maxTemp: response.main.temp_max,
				humidity: response.main.humidity,
				windBearing: response.wind.deg,
				windSpeed: response.wind.speed
			}
		}
	};
	
	app.getForecastFromCache = function(key) {
		return dbPromise.then(function(db) {
			var tx = db.transaction(forecastObj, 'readonly');
			var store = tx.objectStore(forecastObj);
			var index = store.index('key');
			return index.get(key);
	    });
	};
	app.getCitiesFromCache = function() {
		return dbPromise.then(function(db) {
			var tx = db.transaction(citiesObj, 'readonly');
			var cities = tx.objectStore(citiesObj);
			return cities.getAll();
	    });
	};
	
	// Iterate all of the cards and attempt to get the latest forecast data
	app.updateForecasts = function() {
		var keys = Object.keys(app.visibleCards);
		keys.forEach(function(key) {
			app.getForecast(key);
		});
	};

	// save to browser cache
	app.cacheItems = function(items, obj) {
		dbPromise.then(function(db) {
			var tx = db.transaction(obj, 'readwrite');
			var store = tx.objectStore(obj);
			return Promise.all(items.map(function(item) {
		          console.log('Adding item: ', item);
		          return store.add(item);
		        })
		      ).catch(function(e) {
		        tx.abort();
		        console.log(e);
		      }).then(function() {
		        console.log('All items added successfully!');
		      });
		});
	};
	
	app.getCityByName = function(name) {
		app.citiesList.forEach((city) => {
			if (city.name.lower() == name.lower()) {
				return city;
			}
		});
	};
	
	// load api cities
	app.loadCities = function() {
		// check if in cache ...
		app.getCitiesFromCache().then((cities) => {
			if (cities.length > 0) {
				app.citiesList = cities;
				console.log(cities.length + ' cities loaded from cache...');
			} else {
				// otherwise load them from the json and cache them
				loadJSON('city.list.json', function(response) {
					app.citiesList = JSON.parse(response);
					app.cacheItems(app.citiesList, citiesObj);
					console.log(app.citiesList.length + ' cities loaded & cached...');
				});
			}
		});
	};
	
	app.loadCities();
	app.updateForecastCard(injectedForecast);
})();
