import { IRoom, Serialized } from '@rocket.chat/core-typings';
import { useTranslation } from '@rocket.chat/ui-contexts';
import React, { ReactElement } from 'react';

import GenericModal from '../../../../../../components/GenericModal';

type LeaveTeamModalConfirmationProps = {
	onConfirm: (selectedRooms?: { [key: string]: Serialized<IRoom> & { isLastOwner?: boolean } }) => void;
	onClose: () => void;
	onCancel?: () => void;
	selectedRooms: {
		[key: string]: Serialized<IRoom> & { isLastOwner?: boolean };
	};
};

const LeaveTeamModalConfirmation = ({ selectedRooms, onConfirm, onCancel, onClose }: LeaveTeamModalConfirmationProps): ReactElement => {
	const t = useTranslation();

	return (
		<GenericModal
			variant='danger'
			title={t('Confirmation')}
			onConfirm={(): void => onConfirm(selectedRooms)}
			onCancel={onCancel || onClose}
			onClose={onClose}
			confirmText={t('Leave')}
			cancelText={onCancel ? t('Back') : t('Cancel')}
		>
			{t('Teams_leaving_team')}
		</GenericModal>
	);
};

export default LeaveTeamModalConfirmation;
