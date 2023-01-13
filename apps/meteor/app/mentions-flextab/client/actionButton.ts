import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { MessageAction, RoomHistoryManager } from '../../ui-utils/client';
import { messageArgs } from '../../../client/lib/utils/messageArgs';
import { Rooms } from '../../models/client';
import { router } from '../../../client/lib/router';

Meteor.startup(function () {
	MessageAction.addButton({
		id: 'jump-to-message',
		icon: 'jump',
		label: 'Jump_to_message',
		context: ['mentions', 'threads'],
		action(e, props) {
			e.preventDefault();
			e.stopPropagation();
			const { message = messageArgs(this).msg } = props;
			if (window.matchMedia('(max-width: 500px)').matches) {
				(Template.instance() as any).tabBar.close();
			}
			if (message.tmid) {
				return router.go(
					FlowRouter.current().route?.pathDef || FlowRouter.current().path,
					{
						tab: 'thread',
						context: message.tmid,
						rid: message.rid,
						name: Rooms.findOne({ _id: message.rid }).name,
					},
					{
						queryParams: {
							jump: message._id,
						},
					},
				);
			}
			RoomHistoryManager.getSurroundingMessages(message);
		},
		order: 100,
		group: ['message', 'menu'],
	});
});
