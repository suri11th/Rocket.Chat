import type { ReactElement, ReactNode } from 'react';
import React, { Suspense } from 'react';

import PageSkeleton from '../../components/PageSkeleton';
import SidebarPortal from '../../sidebar/SidebarPortal';
import AccountSidebar from './AccountSidebar';

type AccountRouterProps = {
	children?: ReactNode;
};

const AccountRouter = ({ children }: AccountRouterProps): ReactElement => {
	return children ? (
		<>
			<Suspense fallback={<PageSkeleton />}>{children}</Suspense>
			<SidebarPortal>
				<AccountSidebar />
			</SidebarPortal>
		</>
	) : (
		<PageSkeleton />
	);
};

export default AccountRouter;
