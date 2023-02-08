import { OptionTitle } from '@rocket.chat/fuselage';
import { useTranslation, useRoute } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React from 'react';

import { triggerActionButtonAction } from '../../../app/ui-message/client/ActionManager';
import type { IAppAccountBoxItem } from '../../../app/ui-utils/client/lib/AccountBox';
import { useAppRequestStats } from '../../views/marketplace/hooks/useAppRequestStats';
import ListItem from '../Sidebar/ListItem';

type AppsModelListProps = {
	appBoxItems: IAppAccountBoxItem[];
	appsManagementAllowed?: boolean;
	onDismiss: () => void;
};

const AppsModelList = ({ appBoxItems, appsManagementAllowed, onDismiss }: AppsModelListProps): ReactElement => {
	const t = useTranslation();
	const marketplaceRoute = useRoute('marketplace');
	const page = 'list';

	const { data: appRequestStats, isLoading } = useAppRequestStats();

	return (
		<>
			<OptionTitle>{t('Apps')}</OptionTitle>
			<ul>
				<>
					<ListItem
						icon='store'
						text={t('Marketplace')}
						action={(): void => {
							marketplaceRoute.push({ context: 'explore', page });
							onDismiss();
						}}
					/>
					<ListItem
						icon='cube'
						text={t('Installed')}
						action={(): void => {
							marketplaceRoute.push({ context: 'installed', page });
							onDismiss();
						}}
					/>

					{appsManagementAllowed && (
						<ListItem
							icon='cube'
							text={t('Requested')}
							action={(): void => {
								marketplaceRoute.push({ context: 'requested', page });
								onDismiss();
							}}
							loading={isLoading}
							notifications={appRequestStats?.data.totalUnseen ? appRequestStats?.data.totalUnseen : null}
						/>
					)}
				</>
				{appBoxItems.length > 0 && (
					<>
						{appBoxItems.map((item, key) => {
							const action = (): void => {
								triggerActionButtonAction({
									rid: '',
									mid: '',
									actionId: item.actionId,
									appId: item.appId,
									payload: { context: item.context },
								});
								onDismiss();
							};
							return <ListItem text={(t.has(item.name) && t(item.name)) || item.name} action={action} key={item.actionId + key} />;
						})}
					</>
				)}
			</ul>
		</>
	);
};

export default AppsModelList;
