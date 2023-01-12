import { useContext, useMemo } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { RouterContext } from '../RouterContext';

export const useQueryStringParameter = (name: string): string | undefined => {
	const { queryQueryStringParameter } = useContext(RouterContext);

	const { subscribe, get } = useMemo(() => queryQueryStringParameter(name), [queryQueryStringParameter, name]);

	return useSyncExternalStore(subscribe, get);
};
