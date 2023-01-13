import type { Subscribable } from '@rocket.chat/core-typings';
import { createContext } from 'react';

export type RouteName = string;

export type RouteParameters = Record<string, string>;

export type QueryStringParameters = Record<string, string>;

export type RouteGroupName = string;

export type Route = { pathDef: string; action: () => void; name?: string };

export type RouteGroup = {
	readonly prefix: string;
	readonly name?: string;
	readonly routes: Subscribable<Route[]>;
	register(pathDef: string, options: Omit<Route, 'pathDef'>): () => void;
	unregister(pathDef: string): void;
	group(prefix: string, name?: string): RouteGroup;
};

export type Router = RouteGroup & {
	queryRoutePath(
		name: RouteName,
		parameters: RouteParameters | undefined,
		queryStringParameters: QueryStringParameters | undefined,
	): Subscribable<string | undefined>;
	queryRouteUrl: (
		name: RouteName,
		parameters: RouteParameters | undefined,
		queryStringParameters: QueryStringParameters | undefined,
	) => Subscribable<string | undefined>;
	pushRoute: (name: RouteName, parameters: RouteParameters | undefined, queryStringParameters: QueryStringParameters | undefined) => void;
	replaceRoute: (
		name: RouteName,
		parameters: RouteParameters | undefined,
		queryStringParameters: QueryStringParameters | undefined,
	) => void;
	queryRouteParameter: (name: string) => Subscribable<string | undefined>;
	queryQueryStringParameter: (name: string) => Subscribable<string | undefined>;
	queryCurrentRoute: () => Subscribable<readonly [RouteName?, RouteParameters?, QueryStringParameters?, RouteGroupName?]>;
	go(
		pathDef: string,
		params: Record<string, string>,
		options?: { replace?: boolean; queryParams?: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>) },
	): void;
	readonly currentPathDef: Subscribable<string>;
	readonly currentRouteName: Subscribable<string | undefined>;
	readonly params: Subscribable<Record<string, string>>;
	readonly queryParams: Subscribable<Record<string, string>>;
};

export type RouterContextValue = Router;

const defaultCurrentRoute: [undefined, RouteParameters, QueryStringParameters, undefined] = [undefined, {}, {}, undefined];
const defaultRoutes: Route[] = [];

const defaultRouteGroup = {
	prefix: '',
	routes: {
		get: () => defaultRoutes,
		subscribe: () => () => undefined,
	},
	register: () => () => undefined,
	unregister: () => undefined,
	group: () => defaultRouteGroup,
};

const defaultParams = {};

const defaultQueryParams = {};

export const RouterContext = createContext<RouterContextValue>({
	queryRoutePath: () => ({
		subscribe: () => () => undefined,
		get: () => undefined,
	}),
	queryRouteUrl: () => ({
		subscribe: () => () => undefined,
		get: () => undefined,
	}),
	pushRoute: () => undefined,
	replaceRoute: () => undefined,
	queryRouteParameter: () => ({
		subscribe: () => () => undefined,
		get: () => undefined,
	}),
	queryQueryStringParameter: () => ({
		subscribe: () => () => undefined,
		get: () => undefined,
	}),
	queryCurrentRoute: () => ({
		subscribe: () => () => undefined,
		get: () => defaultCurrentRoute,
	}),
	...defaultRouteGroup,
	go: () => undefined,
	currentPathDef: {
		subscribe: () => () => undefined,
		get: () => '/',
	},
	currentRouteName: {
		subscribe: () => () => undefined,
		get: () => undefined,
	},
	params: {
		subscribe: () => () => undefined,
		get: () => defaultParams,
	},
	queryParams: {
		subscribe: () => () => undefined,
		get: () => defaultQueryParams,
	},
});
