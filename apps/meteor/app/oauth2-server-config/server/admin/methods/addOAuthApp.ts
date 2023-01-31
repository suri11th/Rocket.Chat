import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import _ from 'underscore';
import type { IUser } from '@rocket.chat/core-typings';
import { OAuthApps, Users } from '@rocket.chat/models';

import { hasPermission } from '../../../../authorization/server';
import { parseUriList } from '../functions/parseUriList';
import { methodDeprecationLogger } from '../../../../lib/server/lib/deprecationWarningLogger';

export async function addOAuthApp(
	application: {
		name: string;
		active: boolean;
		redirectUri: string;
	},
	uid: string,
) {
	if (!hasPermission(uid, 'manage-oauth-apps')) {
		throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'addOAuthApp' });
	}
	if (!_.isString(application.name) || application.name.trim() === '') {
		throw new Meteor.Error('error-invalid-name', 'Invalid name', { method: 'addOAuthApp' });
	}
	if (!_.isString(application.redirectUri) || application.redirectUri.trim() === '') {
		throw new Meteor.Error('error-invalid-redirectUri', 'Invalid redirectUri', {
			method: 'addOAuthApp',
		});
	}
	if (!_.isBoolean(application.active)) {
		throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
			method: 'addOAuthApp',
		});
	}

	application.redirectUri = parseUriList(application.redirectUri);

	if (application.redirectUri.length === 0) {
		throw new Meteor.Error('error-invalid-redirectUri', 'Invalid redirectUri', {
			method: 'addOAuthApp',
		});
	}

	const createdBy = await Users.findOne<Pick<IUser, '_id' | 'username'>>(uid, { projection: { username: 1 } });
	if (!createdBy || !createdBy._id || !createdBy.username) {
		throw new Meteor.Error('user-not-defined', 'User not defined.', {
			method: 'addOAuthApp',
		});
	}

	const inserted = {
		...application,
		clientId: Random.id(),
		clientSecret: Random.secret(),
		_createdAt: new Date(),
		_updatedAt: new Date(),
		_createdBy: {
			_id: createdBy._id,
			username: createdBy.username,
		},
	};

	return {
		...inserted,
		_id: (await OAuthApps.insertOne(inserted)).insertedId,
	};
}

Meteor.methods({
	async addOAuthApp(application) {
		methodDeprecationLogger.warn(
			'addOAuthApp is deprecated and will be removed in future versions of Rocket.Chat. Use the REST endpoint /v1/oauth-apps.create instead.',
		);
		if (!this.userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'addOAuthApp' });
		}

		return addOAuthApp(application, this.userId);
	},
});