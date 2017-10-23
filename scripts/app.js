(function() {
	'use strict';

	// set apiKey in Weather service
	Weather.setApiKey(settings.WEATHER_SERVICE_API_KEY);

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

	var app = {
			isLoading: true,
			visibleCards: {},
			selectedCities: [],
			spinner: document.querySelector('.loader'),
			cardTemplate: document.querySelector('.cardTemplate'),
			container: document.querySelector('.main'),
			addDialog: document.querySelector('.dialog-container'),
			daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
			
			citiesList: [],
			selectedForecast: null
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
	app.updateForecastCard = function(forecast) {
		if (!forecast) {
			// if no city is specified, fetch the user city;
			app.selectedForecast = app.getUserCity();
			forecast = Weather.getForecast(app.selectedForecast.id);
		}

		var current = forecast.list[0];
		var card = app.visibleCards[app.selectedForecast.id];
		if (!card) {
			card = app.cardTemplate.cloneNode(true);
			card.classList.remove('cardTemplate');
			card.querySelector('.location').textContent = current.label;
			card.removeAttribute('hidden');
			app.container.appendChild(card);
			app.visibleCards[app.selectedForecast.id] = card;
		}
		card.querySelector('.description').textContent = current.weather[0].description;
		var dt = new Date(current.dt_txt);
		var dtString = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
		card.querySelector('.date').textContent = dtString;
		card.querySelector('.current .icon').classList.add('img-' + current.weather[0].icon);
		card.querySelector('.current .temperature .value').textContent =
			Math.round(current.main.temp);
		card.querySelector('.current .min-temperature .value').textContent =
			Math.round(current.main.temp_min);
		card.querySelector('.current .max-temperature .value').textContent =
			Math.round(current.main.temp_max);
		card.querySelector('.current .precip').textContent =
			Math.round(current.rain['3h'] * 100) + '%';
		card.querySelector('.current .humidity').textContent =
			Math.round(current.main.humidity) + '%';
		card.querySelector('.current .wind .value').textContent =
			Math.round(current.wind.speed);
		card.querySelector('.current .wind .direction').textContent =
			current.wind.deg;
		var nextDays = card.querySelectorAll('.future .oneday');

		var forecastByDay = _.groupBy(forecast.list, (daily) => {
			return daily.dt_txt.split(' ')[0];
		});
		var i = 0;
		Object.keys(forecastByDay).forEach((day) => {
			var halfDayForecast = _.find(forecastByDay[day], (forecast) => {
				return forecast.dt_txt.split(' ')[1] == '12:00:00';
			});

			if (halfDayForecast) {
				var d = new Date(day);
				var nextDay = nextDays[i];
				var today = new Date();
			    today = today.getDay();
			    var iconClass = 'img-' + halfDayForecast.weather[0].icon;

				nextDay.querySelector('.date').textContent =
					app.daysOfWeek[(d.getDay() + today) % 7];
				nextDay.querySelector('.icon').classList.add(iconClass);
				nextDay.querySelector('.temp-high .value').textContent =
					Math.round(halfDayForecast.main.temp_max);
				nextDay.querySelector('.temp-low .value').textContent =
					Math.round(halfDayForecast.main.temp_min);

				i += 1;
			}
		})

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
			key: city.name.toLowerCase(),
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
	
	app.getUserCity = function() {
		var userIpInfos = getIPInfos();
		var citiesInUserCountry = _.where(app.citiesList, {country:userIpInfos.country_code});
		var userCity = _.findWhere(citiesInUserCountry, {name:userIpInfos.city});

		// city not found...return first city in same country
		// TODO: instead return closest city by implementing a method that checks the coords
		return userCity || citiesInUserCountry[0];
	};
	
	// load api cities
	app.loadCities = function(callback) {
		// check if in cache ...
		app.getCitiesFromCache().then((cities) => {
			if (cities.length > 0) {
				app.citiesList = cities;
				console.log(cities.length + ' cities loaded from cache...');

				if (callback) {
					callback();
				}
			} else {
				// otherwise load them from the json and cache them
				loadJSON('city.list.json', (cities) => {
					app.citiesList = cities;
					app.cacheItems(app.citiesList, citiesObj);
					console.log(app.citiesList.length + ' cities loaded & cached...');

					if (callback) {
						callback();
					}
				});
			}
		});
	};
	app.populateCitiesDdl = function() {
		app.citiesList.forEach((city) => {
			var ddl = document.getElementById('selectCityToAdd');
			var option = document.createElement('option');
			option.value = city.id;
			option.text = city.name;
			ddl.add(option);
		});
	};

	var callback = function () {
		app.populateCitiesDdl();
		app.updateForecastCard();
	};
	app.loadCities(callback);
})();
