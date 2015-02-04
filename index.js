'use strict';


var passport = require('passport');
var extend = require('extend');


var defaults = {
	configId: 'account'
};


var configDefaults = {
	baseRoute: '/auth'
};


module.exports = function() {

	var that = this;

	if( this._config[defaults.configId] ) {
		var config = extend(true, {}, configDefaults, this._config[defaults.configId]);


		// config.dbService is definitely required!
		if(!config.dbService) {
			throw new Error('Missing dbService');
		}

		// service that returns the db-connection where account will be stored.
		this.service('accountDB', function(inject) {
			return inject([config.dbService, function(db) {
				return db;
			}]);
		});



		/**
		 * extendAccount service to be able to extend default model-schema/options
		 *
		 * @example
		 * function(con, types) {
		 * 	return {
		 * 		schema: {
		 * 			newAttr: types.STRING
		 * 		},
		 * 		options: {
		 * 			classMethods:{
		 * 				customLogin:function() { ... }
		 * 			}
		 * 		}
		 * 	};
		 * }
		 */
		var accountDefinerExtender = {};
		this.service('extendAccount', function(accountDB) {
			return function(handler) {
				var result = handler(accountDB, accountDB.Sequelize);
				extend(true, accountDefinerExtender, result);
			};
		});


		// Configure passport and use passport middleware in app
		this.config(function(app, accountDB) {

			passport.serializeUser(function(user, done) {
				done(null, user.id);
			});

			passport.deserializeUser(function(id, done) {
				accountDB.model('Account').findById(id)
				.then(function(user){
					done(null, user);
				}, function(err) {
					done(err);
				});
			});



			that.logVerbose('Using passport');
			app.use(passport.initialize());


			that.logVerbose('Using passport-session');
			app.use(passport.session());


			that.logVerbose('Using active user in res.locals (account)');
			app.use(function(req, res, next) {
				res.locals.account = req.user;
				next();
			});


		});


		// create basic routes and define model on db with extended schema/options
		this.run(function(router, accountDB) {


			/**
			 * IDEA: Maybe it would be nice to be able to replace the default route handlers.
			 * Or at least to be able to deactivate them. (Deactivation through config???)
			 */


			// Get basic information about account if authenticated
			router.get( config.baseRoute, function(req, res, next) {
				if(req.isAuthenticated()) {
					res.json({
						id: req.user.id,
						username: req.user.username
					});
				} else {
					res.status(401).json({
						message: 'Not authenticated'
					});
				}
			});

			// Login-Route
			router.post( config.baseRoute + '/login', function(req, res, next) {

				accountDB.model('Account').login(req.body.email, req.body.password)

				.then(function(user) {
					req.login(user, function(err) {
						if (err) { return next(err); }
						res.json(user);
					});
				}, function(err) {
					res.status(401).json({
						error:{
							message: err.message
						}
					});
				});

			});



			// Logout-Route
			router.post( config.baseRoute + '/logout', function(req, res) {
				req.logout();
				res.json(true);
			});



			// Register-Route
			router.post( config.baseRoute + '/register', function(req, res, next) {

				var username = req.body.username;
				var email = req.body.email;
				var password = req.body.password;

				accountDB.model('Account').register(username, email, password)

				.then(function(user) {
					req.login(user, function(err) {
						if (err) { return next(err); }
						res.json(user);
					});
				}, function(err) {
					res.status(401).json(err);
				});

			});




			// Read default account-definer Object
			var accountDefiner = require('./lib/_Account.js')(accountDB.Sequelize);

			// Extend it with the accountDefinerExtender-object
			// A global object, which can be extended by extendAccount-service
			extend(true, accountDefiner, accountDefinerExtender);

			// Define model with schema and options from extended accountDefiner-object
			var Model = accountDB.define('Account', accountDefiner.schema, accountDefiner.options);

			// Sync model.
			// To be shure that table in database exists when application starts: return the promise of sync function.
			return Model.sync();
		});

	}




};
