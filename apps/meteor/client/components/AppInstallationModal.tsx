import { Box, Button, Modal } from '@rocket.chat/fuselage';
import { Link } from '@rocket.chat/layout';
import { useTranslation } from '@rocket.chat/ui-contexts';
import React from 'react';

function AppInstallationModal({ currentEnabledApps, enabledAppsLimit }: { currentEnabledApps: number; enabledAppsLimit: number }) {
	const t = useTranslation();

	const modalBuilder = () => {
		if (currentEnabledApps < enabledAppsLimit) {
			return {
				title: t('Private_Apps_Enabled', { currentEnabledApps, enabledAppsLimit }),
				content: (
					<Box display='flex' flexDirection='column'>
						{t('Workspaces_on_Community_private_apps', { enabledAppsLimit })}
						{t('Upgrade_to_Enterprise')}
					</Box>
				),
				button: <Button primary>{t('Next')}</Button>,
			};
		}
		if (currentEnabledApps === enabledAppsLimit) {
			return {
				title: t('Private_app_limit_reached'),
				content: (
					<Box display='flex' flexDirection='column'>
						<Box fontWeight='p1b' mbe='x16'>
							{t('Private_Apps_Currently_Enabled', { currentEnabledApps, enabledAppsLimit })}
						</Box>

						{t('Workspaces_on_Community_private_apps', { enabledAppsLimit })}
						<Box mb='x16'>
							<Box fontWeight='p1b'>{t('This_app_will_be_disabled')}</Box> {t('Disable_another_app')}
						</Box>
					</Box>
				),
				button: <Button secondary>{t('Upload_anyway')}</Button>,
			};
		}

		const numberOfExceededApps = currentEnabledApps - enabledAppsLimit;

		return {
			title: t('Private_apps_limit_exceeded'),
			content: (
				<Box display='flex' flexDirection='column'>
					<Box mbe='x16'>
						{t('Private_Apps_Currently_Enabled', { currentEnabledApps, enabledAppsLimit })}
						{t('Community_Private_apps_limit_exceeded')}
					</Box>
					{t('Workspaces_on_Community_private_apps', { enabledAppsLimit })}
					<Box mb='x16'>
						<Box fontWeight='p1b'>{t('This_app_will_be_disabled')}</Box> {t('Disable_at_least_more_apps', { numberOfExceededApps })}
					</Box>
				</Box>
			),
			button: <Button secondary>{t('Upload_anyway')}</Button>,
		};
	};

	return (
		<>
			<Modal>
				<Modal.Header>
					<Modal.HeaderText>
						<Modal.Title>{modalBuilder().title}</Modal.Title>
					</Modal.HeaderText>
					<Modal.Close />
				</Modal.Header>

				<Modal.Content>{modalBuilder().content}</Modal.Content>

				<Modal.Footer justifyContent='space-between'>
					<Modal.FooterAnnotation>
						<Link href='#' color='font-on-info'>
							{t('Learn_more')}
						</Link>
					</Modal.FooterAnnotation>
					<Modal.FooterControllers>
						<Button>{t('Enable_unlimited_apps')}</Button>
						{modalBuilder().button}
					</Modal.FooterControllers>
				</Modal.Footer>
			</Modal>
		</>
	);
}

export default AppInstallationModal;
