'use strict';

module.exports = function(db, Type) {

	var Model = db.define('Account', {
		username: {
			type: Type.STRING,
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
			type: Type.STRING,
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
			type: Type.STRING,
			allowNull: false,
			select: false
		},
		lastLoginAt: {
			type: Type.DATE
		},
		active: {
			type: Type.BOOLEAN,
			defaultValue: false,
		}
	},{
		instanceMethods: {
			$activate: function() {
				this.active = true;
				return this.save();
			}
		}
	});

	Model.$authSerialize = function(user) {
		return user.id;
	};

	Model.$authDeserialize = function(id) {
		return this.getById(id);
	};

	Model.$authGetByEmail = function(email) {
		return this.findOne({
			where: {
				email: email
			}
		});
	};

	Model.$getById = function(id) {
		return this.getById(id);
	};






	Model.getById = function(id) {
		return this.findOne(id);
	};

	Model.getByUsername = function(username) {
		return this.findOne({
			where: {
				username: username
			}
		});
	};

	Model.$authRegister = function(username, email, password) {
		return this.create({
			username: username,
			email: email,
			password: password
		});
	};

	return Model;

};

