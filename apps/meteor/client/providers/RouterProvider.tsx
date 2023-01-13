import { RouterContext } from '@rocket.chat/ui-contexts';
import type { FC } from 'react';
import React, { useEffect } from 'react';

import { router } from '../lib/router';

const RouterProvider: FC = ({ children }) => {
	useEffect(() => {
		router.setUp();
		return () => {
			router.tearDown();
		};
	}, []);

	return <RouterContext.Provider children={children} value={router} />;
};

export default RouterProvider;
