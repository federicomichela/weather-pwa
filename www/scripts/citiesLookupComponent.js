Vue.component('cities-lookup', {
	data: function() {
		return {
			search: '',
		};
	},
	template: `
		<div>
			<input type="text" v-model="search" list="countries" class="controls" placeholder="Start typing here" />
			<datalist id="countries">
				<option value="{city}" v-for="city in cities" />
			</datalist>
		</div>
	`,
	computed: {
		cities: function() {
			var searchTerm = this.search.toLowerCase().trim();
			if (searchTerm.length > 0) {
//				var autocomplete = new google.maps.places.Autocomplete(searchTems);
				var url = GOOGLE_PLACES_URL.format(searchTerm);
				getResponse(url, true).then(response => {
					return _.map(response, 'description');
				});
			}
		}
	}
});