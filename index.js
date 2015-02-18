'use strict';


module.exports = function() {


	this.config(function($dbProvider, $path, $configProvider, $is, $authProvider) {

		var dbService = $configProvider.get('account.dbService');

		if( !$is.string(dbService) ) {
			throw new Error('Missing \'dbService\' for account in config.');
		}

		$dbProvider.onConnected(dbService, function(con) {

			con.import( $path.join(__dirname, 'lib', 'AccountModel.js') );
			con.sync();

		});

		$authProvider
			.defineModel(function($db) {
				return $db[dbService].model('Account');
			});

	});



};
