import type { IMessage } from '@rocket.chat/core-typings';
import { isDiscussionMessage, isThreadMainMessage, isE2EEMessage } from '@rocket.chat/core-typings';
import type { TranslationKey } from '@rocket.chat/ui-contexts';
import { useSetting, useTranslation, useUserId } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { useMemo, memo } from 'react';

import { useUserData } from '../../../../hooks/useUserData';
import type { UserPresence } from '../../../../lib/presence';
import { useRoomSubscription } from '../../../../views/room/contexts/RoomContext';
import MessageContentBody from '../../MessageContentBody';
import ReadReceiptIndicator from '../../ReadReceiptIndicator';
import Attachments from '../../content/Attachments';
import BroadcastMetrics from '../../content/BroadcastMetrics';
import DiscussionMetrics from '../../content/DiscussionMetrics';
import Location from '../../content/Location';
import MessageActions from '../../content/MessageActions';
import Reactions from '../../content/Reactions';
import ThreadMetrics from '../../content/ThreadMetrics';
import UiKitSurface from '../../content/UiKitSurface';
import UrlPreviews from '../../content/UrlPreviews';
import { useMessageNormalization } from '../../hooks/useMessageNormalization';
import { useOembedLayout } from '../../hooks/useOembedLayout';

type RoomMessageContentProps = {
	message: IMessage;
	unread: boolean;
	mention: boolean;
	all: boolean;
};

const RoomMessageContent = ({ message, unread, all, mention }: RoomMessageContentProps): ReactElement => {
	const encrypted = isE2EEMessage(message);
	const { enabled: oembedEnabled } = useOembedLayout();
	const broadcast = useRoomSubscription()?.broadcast ?? false;
	const uid = useUserId();
	const messageUser: UserPresence = { ...message.u, roles: [], ...useUserData(message.u._id) };
	const readReceiptEnabled = useSetting('Message_Read_Receipt_Enabled', false);

	const t = useTranslation();

	const normalizeMessage = useMessageNormalization();
	const normalizedMessage = useMemo(() => normalizeMessage(message), [message, normalizeMessage]);

	return (
		<>
			{!normalizedMessage.blocks?.length && !!normalizedMessage.md?.length && (
				<>
					{(!encrypted || normalizedMessage.e2e === 'done') && (
						<MessageContentBody md={normalizedMessage.md} mentions={normalizedMessage.mentions} channels={normalizedMessage.channels} />
					)}
					{encrypted && normalizedMessage.e2e === 'pending' && t('E2E_message_encrypted_placeholder')}
				</>
			)}

			{normalizedMessage.blocks && (
				<UiKitSurface mid={normalizedMessage._id} blocks={normalizedMessage.blocks} appId rid={normalizedMessage.rid} />
			)}

			{!!normalizedMessage?.attachments?.length && (
				<Attachments attachments={normalizedMessage.attachments} file={normalizedMessage.file} />
			)}

			{oembedEnabled && !!normalizedMessage.urls?.length && <UrlPreviews urls={normalizedMessage.urls} />}

			{normalizedMessage.actionLinks?.length && (
				<MessageActions
					message={normalizedMessage}
					actions={normalizedMessage.actionLinks.map(({ method_id: methodId, i18nLabel, ...action }) => ({
						methodId,
						i18nLabel: i18nLabel as TranslationKey,
						...action,
					}))}
				/>
			)}

			{normalizedMessage.reactions && Object.keys(normalizedMessage.reactions).length && <Reactions message={normalizedMessage} />}

			{isThreadMainMessage(normalizedMessage) && (
				<ThreadMetrics
					counter={normalizedMessage.tcount}
					following={Boolean(uid && normalizedMessage?.replies?.indexOf(uid) > -1)}
					mid={normalizedMessage._id}
					rid={normalizedMessage.rid}
					lm={normalizedMessage.tlm}
					unread={unread}
					mention={mention}
					all={all}
					participants={normalizedMessage?.replies?.length}
				/>
			)}

			{isDiscussionMessage(normalizedMessage) && (
				<DiscussionMetrics
					count={normalizedMessage.dcount}
					drid={normalizedMessage.drid}
					lm={normalizedMessage.dlm}
					rid={normalizedMessage.rid}
				/>
			)}

			{normalizedMessage.location && <Location location={normalizedMessage.location} />}

			{broadcast && !!messageUser.username && normalizedMessage.u._id !== uid && (
				<BroadcastMetrics username={messageUser.username} message={normalizedMessage} />
			)}

			{readReceiptEnabled && <ReadReceiptIndicator unread={normalizedMessage.unread} />}
		</>
	);
};

export default memo(RoomMessageContent);
