import type { AppStatus } from '@rocket.chat/apps-engine/definition/AppStatus';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { usePermission } from '@rocket.chat/ui-contexts';
import type { FC, Reducer } from 'react';
import React, { useEffect, useReducer, useCallback } from 'react';

import { AppEvents } from '../../../app/apps/client/communication';
import { Apps } from '../../../app/apps/client/orchestrator';
import type { AsyncState } from '../../lib/asyncState';
import { AsyncStatePhase } from '../../lib/asyncState';
import { AppsContext } from './AppsContext';
import { handleAPIError } from './helpers';
import type { App } from './types';

type ListenersMapping = {
	readonly [P in keyof typeof AppEvents]?: (...args: any[]) => void;
};

const registerListeners = (listeners: ListenersMapping): (() => void) => {
	const entries = Object.entries(listeners) as Exclude<
		{
			[K in keyof ListenersMapping]: [K, ListenersMapping[K]];
		}[keyof ListenersMapping],
		undefined
	>[];
	for (const [event, callback] of entries) {
		Apps.getWsListener()?.registerListener(AppEvents[event], callback);
	}
	return (): void => {
		for (const [event, callback] of entries) {
			Apps.getWsListener()?.unregisterListener(AppEvents[event], callback);
		}
	};
};

type Action =
	| { type: 'request'; reload: () => Promise<void> }
	| { type: 'update'; app: App; reload: () => Promise<void> }
	| { type: 'delete'; appId: string; reload: () => Promise<void> }
	| { type: 'invalidate'; appId: string; reload: () => Promise<void> }
	| { type: 'success'; apps: App[]; reload: () => Promise<void> }
	| { type: 'failure'; error: Error; reload: () => Promise<void> };

const sortByName = (apps: App[]): App[] => apps.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));

const reducer = (
	state: AsyncState<{ apps: App[] }> & {
		reload: () => Promise<void>;
	},
	action: Action,
): AsyncState<{ apps: App[] }> & {
	reload: () => Promise<void>;
} => {
	switch (action.type) {
		case 'invalidate':
			if (state.phase !== AsyncStatePhase.RESOLVED) {
				return state;
			}
			return {
				phase: AsyncStatePhase.RESOLVED,
				reload: action.reload,
				value: {
					apps: sortByName(
						state.value.apps.map((app) => {
							if (app.id === action.appId) {
								return { ...app };
							}
							return app;
						}),
					),
				},
				error: undefined,
			};
		case 'update':
			if (state.phase !== AsyncStatePhase.RESOLVED) {
				return state;
			}
			return {
				phase: AsyncStatePhase.RESOLVED,
				reload: async (): Promise<void> => undefined,
				value: {
					apps: sortByName(
						state.value.apps.map((app) => {
							if (app.id === action.app.id) {
								return action.app;
							}
							return app;
						}),
					),
				},
				error: undefined,
			};
		case 'request':
			return {
				reload: async (): Promise<void> => undefined,
				phase: AsyncStatePhase.LOADING,
				value: undefined,
				error: undefined,
			};
		case 'success':
			return {
				reload: action.reload,
				phase: AsyncStatePhase.RESOLVED,
				value: { apps: sortByName(action.apps) },
				error: undefined,
			};
		case 'delete':
			if (state.phase !== AsyncStatePhase.RESOLVED) {
				return state;
			}
			return {
				reload: action.reload,
				phase: AsyncStatePhase.RESOLVED,
				value: { apps: state.value.apps.filter(({ id }) => id !== action.appId) },
				error: undefined,
			};
		case 'failure':
			return {
				reload: action.reload,
				phase: AsyncStatePhase.REJECTED,
				value: undefined,
				error: action.error,
			};
		default:
			return state;
	}
};

const AppsProvider: FC = ({ children }) => {
	const [marketplaceAppsState, dispatchMarketplaceApps] = useReducer<
		Reducer<
			AsyncState<{ apps: App[] }> & {
				reload: () => Promise<void>;
			},
			Action
		>
	>(reducer, {
		phase: AsyncStatePhase.LOADING,
		value: undefined,
		error: undefined,
		reload: async () => undefined,
	});

	const [installedAppsState, dispatchInstalledApps] = useReducer<
		Reducer<
			AsyncState<{ apps: App[] }> & {
				reload: () => Promise<void>;
			},
			Action
		>
	>(reducer, {
		phase: AsyncStatePhase.LOADING,
		value: undefined,
		error: undefined,
		reload: async () => undefined,
	});

	const [privateAppsState, dispatchPrivateApps] = useReducer<
		Reducer<
			AsyncState<{ apps: App[] }> & {
				reload: () => Promise<void>;
			},
			Action
		>
	>(reducer, {
		phase: AsyncStatePhase.LOADING,
		value: undefined,
		error: undefined,
		reload: async () => undefined,
	});

	const isAdminUser = usePermission('manage-apps');

	const fetch = useCallback(async (isAdminUser?: string): Promise<void> => {
		dispatchMarketplaceApps({ type: 'request', reload: async () => undefined });
		dispatchInstalledApps({ type: 'request', reload: async () => undefined });
		dispatchPrivateApps({ type: 'request', reload: async () => undefined });

		let installedApps: App[] = [];
		let marketplaceApps: App[] = [];
		let privateApps: App[] = [];
		let marketplaceError = false;
		let installedAppsError = false;
		let privateAppsError = false;

		try {
			marketplaceApps = (await Apps.getAppsFromMarketplace(isAdminUser)) as unknown as App[];
		} catch (e) {
			dispatchMarketplaceApps({
				type: 'failure',
				error: e instanceof Error ? e : new Error(String(e)),
				reload: fetch,
			});
			marketplaceError = true;
		}

		try {
			installedApps = await Apps.getInstalledApps().then((result: App[]) =>
				result.map((current: App) => ({
					...current,
					installed: true,
					marketplace: false,
				})),
			);
		} catch (e) {
			dispatchInstalledApps({
				type: 'failure',
				error: e instanceof Error ? e : new Error(String(e)),
				reload: fetch,
			});
			installedAppsError = true;
		}

		try {
			privateApps = installedApps.filter((app: App) => app.private);
		} catch (e) {
			dispatchPrivateApps({
				type: 'failure',
				error: e instanceof Error ? e : new Error(String(e)),
				reload: fetch,
			});

			privateAppsError = true;
		}

		const installedAppsData: App[] = [];
		const marketplaceAppsData: App[] = [];
		const privateAppsData: App[] = [];

		if (!marketplaceError) {
			marketplaceApps.forEach((app) => {
				const appIndex = installedApps.findIndex(({ id }) => id === app.id);
				if (!installedApps[appIndex]) {
					marketplaceAppsData.push({
						...app,
						status: undefined,
						marketplaceVersion: app.version,
						bundledIn: app.bundledIn,
					});

					return;
				}
				const [installedApp] = installedApps.splice(appIndex, 1);
				const appData = {
					...app,
					installed: true,
					...(installedApp && {
						status: installedApp.status,
						version: installedApp.version,
						licenseValidation: installedApp.licenseValidation,
					}),
					bundledIn: app.bundledIn,
					marketplaceVersion: app.version,
				};

				installedAppsData.push(appData);
				marketplaceAppsData.push(appData);
			});
			dispatchMarketplaceApps({
				type: 'success',
				reload: fetch,
				apps: marketplaceAppsData,
			});
		}

		if (!installedAppsError) {
			if (installedApps.length > 0) {
				installedAppsData.push(...installedApps);
			}

			dispatchInstalledApps({
				type: 'success',
				reload: fetch,
				apps: installedAppsData,
			});
		}

		if (!privateAppsError) {
			if (privateApps.length > 0) {
				privateAppsData.push(...privateApps);
			}

			dispatchPrivateApps({
				type: 'success',
				reload: fetch,
				apps: privateAppsData,
			});
		}
	}, []);

	const getCurrentData = useMutableCallback(function getCurrentData() {
		return [marketplaceAppsState, installedAppsState, privateAppsState];
	});

	useEffect(() => {
		const handleAppAddedOrUpdated = async (appId: string): Promise<void> => {
			let marketplaceApp: { app: App; success: boolean } | undefined;
			let installedApp: App;
			let privateApp: App | undefined;

			try {
				const app = await Apps.getApp(appId);

				if (app.private) {
					privateApp = app;
				}

				installedApp = app;
			} catch (error: any) {
				handleAPIError(error);
				throw error;
			}

			try {
				marketplaceApp = await Apps.getAppFromMarketplace(appId, installedApp.version);
			} catch (error: any) {
				handleAPIError(error);
			}

			if (marketplaceApp !== undefined) {
				const { status, version, licenseValidation } = installedApp;
				const record = {
					...marketplaceApp.app,
					success: marketplaceApp.success,
					installed: true,
					status,
					version,
					licenseValidation,
					marketplaceVersion: marketplaceApp.app.version,
				};

				const [, installedApps] = getCurrentData();

				dispatchMarketplaceApps({
					type: 'update',
					app: record,
					reload: fetch,
				});

				if (installedApps.value) {
					dispatchInstalledApps({
						type: 'success',
						apps: [...installedApps.value.apps, record],
						reload: fetch,
					});
					return;
				}

				dispatchInstalledApps({
					type: 'success',
					apps: [record],
					reload: fetch,
				});

				return;
			}

			if (privateApp) {
				dispatchPrivateApps({ type: 'update', app: privateApp, reload: fetch });
			}

			dispatchInstalledApps({ type: 'update', app: installedApp, reload: fetch });
		};
		const listeners = {
			APP_ADDED: handleAppAddedOrUpdated,
			APP_UPDATED: handleAppAddedOrUpdated,
			APP_REMOVED: (appId: string): void => {
				const [updatedData] = getCurrentData();
				const app = updatedData.value?.apps.find(({ id }: { id: string }) => id === appId);

				dispatchInstalledApps({
					type: 'delete',
					appId,
					reload: fetch,
				});

				if (!app) {
					return;
				}

				if (app.private) {
					dispatchPrivateApps({
						type: 'delete',
						appId,
						reload: fetch,
					});
				}

				dispatchMarketplaceApps({
					type: 'update',
					reload: fetch,
					app: {
						...app,
						version: app?.marketplaceVersion,
						installed: false,
						marketplaceVersion: app?.marketplaceVersion,
					},
				});
			},
			APP_STATUS_CHANGE: ({ appId, status }: { appId: string; status: AppStatus }): void => {
				const [updatedData] = getCurrentData();
				const app = updatedData.value?.apps.find(({ id }: { id: string }) => id === appId);
				if (!app) {
					return;
				}

				app.status = status;

				dispatchInstalledApps({
					type: 'update',
					app: {
						...app,
						status,
					},
					reload: fetch,
				});

				if (app.private) {
					dispatchPrivateApps({
						type: 'update',
						app: {
							...app,
							status,
						},
						reload: fetch,
					});
				}

				dispatchMarketplaceApps({
					type: 'update',
					app: {
						...app,
						status,
					},
					reload: fetch,
				});
			},
			APP_SETTING_UPDATED: ({ appId }: { appId: string }): void => {
				dispatchInstalledApps({ type: 'invalidate', appId, reload: fetch });
				dispatchMarketplaceApps({ type: 'invalidate', appId, reload: fetch });
				dispatchPrivateApps({ type: 'invalidate', appId, reload: fetch });
			},
		};
		const unregisterListeners = registerListeners(listeners);
		try {
			fetch(isAdminUser ? 'true' : 'false');
		} finally {
			// eslint-disable-next-line no-unsafe-finally
			return unregisterListeners;
		}
	}, [fetch, getCurrentData, isAdminUser]);
	return (
		<AppsContext.Provider
			children={children}
			value={{ installedApps: installedAppsState, marketplaceApps: marketplaceAppsState, privateApps: privateAppsState, reload: fetch }}
		/>
	);
};
export default AppsProvider;
