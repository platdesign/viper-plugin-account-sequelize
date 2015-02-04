'use strict';

var bcrypt = require('bcrypt');
var Q = require('q');

module.exports = function(types) {

	return {
		schema: {
			username: {
				type: types.STRING,
				unique: true,
				allowNull: false,
				validate: {
					isAlpha: {
						args: true,
						msg: 'Username should contain only characters.'
					},
					len: {
						args: [4,255],
						msg: 'Username needs at least 4 characters.'
					}
				}
			},
			email: {
				type: types.STRING,
				allowNull: false,
				unique: true,
				validate: {
					len: {
						args: [7,255],
						msg: 'eMail needs at least 7 characters.'
					},
					isEmail: {
						args: true,
						msg: 'No valid eMail-Address.'
					}
				}
			},
			password: {
				type: types.STRING,
				allowNull: false,
				validate: {
					len: {
						args: [8,255],
						msg: 'Password needs at least a length of 8.'
					},
				},
				set: function(val) {

					if(val.length >= 8) {
						var salt = bcrypt.genSaltSync(10);
						var hash = bcrypt.hashSync(val, salt);

						this.setDataValue('password', hash);
					} else {
						this.setDataValue('password', '');
					}


				}
			},
			lastLoginAt: {
				type: types.DATE
			}
		},
		options: {
			instanceMethods: {
				verifyPassword: function(password) {
					return bcrypt.compareSync(password, this.password);
				},
				setNewPassword: function(old, newPassword) {
					var d = Q.defer();

					var user = this;

					if(this.verifyPassword(old)) {
						user.password = newPassword;

						user.save().then(function() {
							d.resolve( user );
						});
					} else {
						d.reject(new Error('Password does not match.'));
					}

					return d.promise;
				},

				public: function() {
					return {
						id: this.id,
						username: this.username,
						email: this.email
					};
				}
			},

			classMethods: {
				login: function(email, password) {
					return this.findOne({ where: {
						email: email
					}}).then(function(user) {
						if(!user) {
							throw new Error('User not found!');
						}

						if(user.verifyPassword(password)) {
							user.lastLoginAt = new Date();
							user.save();
							return user;
						} else {
							throw new Error('Password does not match.');
						}

					});
				},


				findById: function(id) {
					return this.findOne(id);
				},

				register: function(username, email, password) {

					return this.create({
						username: username,
						email: email,
						password: password,
						lastLoginAt: new Date()
					});

				}
			}
		}
	};

};

