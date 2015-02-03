'use strict';


var passport = require('passport');
var extend = require('extend');
var path = require('path');

var defaults = {
	configId: 'account'
};


var configDefaults = {
	baseRoute: '/auth'
};


module.exports = function() {



	if( this._config[defaults.configId] ) {
		var config = extend(true, {}, configDefaults, this._config[defaults.configId]);

		if(!config.dbService) {
			throw new Error('Missing dbService');
		}

		var dbGetter = new Function(config.dbService, 'return arguments[0];');


		this.service('accountDB', function(inject) {
			return inject(dbGetter);
		});

		var Model;

		this.config(function(app, inject, accountDB) {

			Model = accountDB.import( path.join(__dirname, 'lib', 'Account.js') );

			passport.serializeUser(function(user, done) {
				done(null, user.id);
			});

			passport.deserializeUser(function(id, done) {
				Model.findById(id).then(function(user){
					done(null, user);
				}, function(err) {
					done(err);
				});
			});

			app.use(passport.initialize());
			app.use(passport.session());

			app.use(function(req, res, next) {

				/*
				Object.prototype.__defineGetter__.apply(res.locals, ['account', function() {
					return req.user;
				}]);
				*/

				res.locals.account = req.user;
				next();
			});

		});



		this.run(function(router) {


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

			router.post( config.baseRoute + '/login', function(req, res, next) {
				Model.login(req.body.email, req.body.password)
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


			router.post( config.baseRoute + '/logout', function(req, res) {
				req.logout();
				res.json(true);
			});

			router.post( config.baseRoute + '/register', function(req, res, next) {

				var username = req.body.username;
				var email = req.body.email;
				var password = req.body.password;

				Model.register(username, email, password)
				.then(function(user) {
					req.login(user, function(err) {
						if (err) { return next(err); }
						res.json(user);
					});
				}, function(err) {
					res.status(401).json(err);
				});

			});
		});

	}




};
