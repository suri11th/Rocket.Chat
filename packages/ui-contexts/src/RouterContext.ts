import type { Subscribable } from '@rocket.chat/core-typings';
import { createContext } from 'react';

export type RouteName = string;

export type RouteParameters = Record<string, string>;

export type QueryStringParameters = Record<string, string>;

export type RouteGroupName = string;

export type RouterContextValue = {
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
};

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
		subscribe: () => (): void => undefined,
		get: (): [undefined, RouteParameters, QueryStringParameters, undefined] => [undefined, {}, {}, undefined],
	}),
});
