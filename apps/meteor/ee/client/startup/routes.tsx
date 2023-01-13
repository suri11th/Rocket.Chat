import React, { lazy } from 'react';

import { appLayout } from '../../../client/lib/appLayout';
import { router } from '../../../client/lib/router';
import MainLayout from '../../../client/views/root/MainLayout';

const AuditPage = lazy(() => import('../audit/AuditPage'));
const AuditLogPage = lazy(() => import('../audit/AuditLogPage'));

router.register('/audit', {
	name: 'audit-home',
	action() {
		appLayout.render(
			<MainLayout>
				<AuditPage />
			</MainLayout>,
		);
	},
});

router.register('/audit-log', {
	name: 'audit-log',
	action() {
		appLayout.render(
			<MainLayout>
				<AuditLogPage />
			</MainLayout>,
		);
	},
});
