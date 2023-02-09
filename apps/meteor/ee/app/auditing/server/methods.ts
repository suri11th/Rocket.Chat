import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';
import { escapeRegExp } from '@rocket.chat/string-helpers';
import type { ILivechatAgent, ILivechatVisitor, IMessage, IRoom, IUser } from '@rocket.chat/core-typings';
import type { Mongo } from 'meteor/mongo';

import AuditLog from './auditLog';
import { LivechatRooms, Rooms, Messages, Users } from '../../../../app/models/server';
import { hasPermission } from '../../../../app/authorization/server';
import { updateCounter } from '../../../../app/statistics/server';

const getValue = (room?: IRoom) => room && { rids: [room._id], name: room.name };

const getUsersIdFromUserName = (usernames: IUser['username'][]) => {
	const user: IUser[] = usernames ? Users.findByUsername({ $in: usernames }) : undefined;
	return user.map((userId) => userId._id);
};

const getRoomInfoByAuditParams = ({
	type,
	roomId: rid,
	users: usernames,
	visitor,
	agent,
}: {
	type: string;
	roomId: IRoom['_id'];
	users: IUser['username'][];
	visitor: ILivechatVisitor;
	agent: ILivechatAgent | 'all';
}) => {
	if (rid) {
		return getValue(Rooms.findOne({ _id: rid }));
	}

	if (type === 'd') {
		return getValue(Rooms.findDirectRoomContainingAllUsernames(usernames));
	}

	if (type === 'l') {
		console.warn('Deprecation Warning! This method will be removed in the next version (4.0.0)');
		const rooms: IRoom[] = LivechatRooms.findByVisitorIdAndAgentId(visitor, agent, {
			fields: { _id: 1 },
		}).fetch();
		return rooms?.length ? { rids: rooms.map(({ _id }) => _id), name: TAPi18n.__('Omnichannel') } : undefined;
	}
};

Meteor.methods({
	auditGetOmnichannelMessages({
		startDate,
		endDate,
		users: usernames,
		msg,
		type,
		visitor,
		agent,
	}: {
		startDate: Date;
		endDate: Date;
		users: IUser['username'][];
		msg: IMessage['msg'];
		type: string;
		visitor: ILivechatVisitor;
		agent: ILivechatAgent | 'all';
	}) {
		check(startDate, Date);
		check(endDate, Date);

		const user = Meteor.user();
		if (!user || !hasPermission(user._id, 'can-audit')) {
			throw new Meteor.Error('Not allowed');
		}

		const rooms: IRoom[] = LivechatRooms.findByVisitorIdAndAgentId(visitor, agent !== 'all' && agent, {
			fields: { _id: 1 },
		}).fetch();
		const rids = rooms?.length ? rooms.map(({ _id }) => _id) : undefined;
		const name = TAPi18n.__('Omnichannel');

		const query: Mongo.Selector<IMessage> = {
			rid: { $in: rids },
			ts: {
				$gt: startDate,
				$lt: endDate,
			},
		};

		if (msg) {
			const regex = new RegExp(escapeRegExp(msg).trim(), 'i');
			query.msg = regex;
		}
		const messages = Messages.find(query).fetch();

		// Once the filter is applied, messages will be shown and a log containing all filters will be saved for further auditing.

		AuditLog.insert({
			ts: new Date(),
			results: messages.length,
			u: user,
			fields: { msg, users: usernames, rids, room: name, startDate, endDate, type, visitor, agent },
		});

		return messages;
	},
	auditGetMessages({
		rid,
		startDate,
		endDate,
		users: usernames,
		msg,
		type,
		visitor,
		agent,
	}: {
		rid: IRoom['_id'];
		startDate: Date;
		endDate: Date;
		users: IUser['username'][];
		msg: IMessage['msg'];
		type: string;
		visitor: ILivechatVisitor;
		agent: ILivechatAgent | 'all';
	}) {
		check(startDate, Date);
		check(endDate, Date);

		const user = Meteor.user();
		if (!user || !hasPermission(user._id, 'can-audit')) {
			throw new Meteor.Error('Not allowed');
		}

		let rids;
		let name;

		const query: Mongo.Selector<IMessage> = {
			ts: {
				$gt: startDate,
				$lt: endDate,
			},
		};

		if (type === 'u') {
			const usersId = getUsersIdFromUserName(usernames);
			query['u._id'] = { $in: usersId };
		} else {
			const roomInfo = getRoomInfoByAuditParams({ type, roomId: rid, users: usernames, visitor, agent });
			if (!roomInfo) {
				throw new Meteor.Error('Room doesn`t exist');
			}

			rids = roomInfo.rids;
			name = roomInfo.name;
			query.rid = { $in: rids };
		}

		if (msg) {
			const regex = new RegExp(escapeRegExp(msg).trim(), 'i');
			query.msg = regex;
		}

		const messages = Messages.find(query).fetch();

		// Once the filter is applied, messages will be shown and a log containing all filters will be saved for further auditing.

		AuditLog.insert({
			ts: new Date(),
			results: messages.length,
			u: user,
			fields: { msg, users: usernames, rids, room: name, startDate, endDate, type, visitor, agent },
		});
		updateCounter({ settingsId: 'Message_Auditing_Panel_Load_Count' });

		return messages;
	},
	auditGetAuditions({ startDate, endDate }) {
		check(startDate, Date);
		check(endDate, Date);
		const uid = Meteor.userId();
		if (!uid || !hasPermission(uid, 'can-audit-log')) {
			throw new Meteor.Error('Not allowed');
		}
		return AuditLog.find({
			// 'u._id': userId,
			ts: {
				$gt: startDate,
				$lt: endDate,
			},
		}).fetch();
	},
});

DDPRateLimiter.addRule(
	{
		type: 'method',
		name: 'auditGetAuditions',
		userId(/* userId*/) {
			return true;
		},
	},
	10,
	60000,
);

DDPRateLimiter.addRule(
	{
		type: 'method',
		name: 'auditGetMessages',
		userId(/* userId*/) {
			return true;
		},
	},
	10,
	60000,
);
