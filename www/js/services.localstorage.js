angular.module('services.localstorage', [])

.factory('$localStorage', function() {

	// Helper method to manage an array of data through localstorage
	return {
		// This pulls out an item from localstorage and tries to parse it as JSON strings
		get	:	function LocalStorageServiceGet(key, defaultValue) {
			var stored = localStorage.getItem(key);
			try
			{
				stored = angular.fromJson(stored);
			}
			catch (err)
			{
				stored = null;
			}
			if (defaultValue && stored === null)
			{
				stored = defaultValue;
			}
			return stored;
		},
		// This stores data into localstorage, but converts values to a JSON string first
		set	:	function LocalStorageServiceSet(key, value) {
			if (value)
			{
				localStorage.setItem(key, angular.toJson(value));
			}
		},
		// This will remove a key from localstorage
		clear	:	function LocalStorageServiceClear(key) {
			localStorage.removeItem(key);
		}
	};

});
