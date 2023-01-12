import { Emitter } from '@rocket.chat/emitter';
import type { RouterContextValue } from '@rocket.chat/ui-contexts';
import { RouterContext } from '@rocket.chat/ui-contexts';
import type { RouteParameters, QueryStringParameters } from '@rocket.chat/ui-contexts/dist/RouterContext';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Tracker } from 'meteor/tracker';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';

class Router implements RouterContextValue {
	private computation: Tracker.Computation;

	private emitter = new Emitter<{ update: void }>();

	private currentRoute = this.createCurrentRoute();

	private createCurrentRoute() {
		const { route, params, queryParams } = FlowRouter.current();
		return [route?.name, params, queryParams, route?.group?.name] as const;
	}

	public setUp() {
		this.computation = Tracker.autorun(() => {
			FlowRouter.watchPathChange();
			this.currentRoute = this.createCurrentRoute();
			this.emitter.emit('update');
		});
	}

	public tearDown() {
		this.computation.stop();
	}

	private subscribe = this.emitter.on.bind(this.emitter, 'update');

	queryRoutePath = (
		name: string,
		parameters: Record<string, string> | undefined,
		queryStringParameters: Record<string, string> | undefined,
	): ReturnType<RouterContextValue['queryRoutePath']> => {
		return { subscribe: this.subscribe, get: () => FlowRouter.path(name, parameters, queryStringParameters) };
	};

	queryRouteUrl = (
		name: string,
		parameters: Record<string, string> | undefined,
		queryStringParameters: Record<string, string> | undefined,
	) => {
		return { subscribe: this.subscribe, get: () => FlowRouter.url(name, parameters, queryStringParameters) };
	};

	pushRoute = (name: string, parameters: Record<string, string> | undefined, queryStringParameters: Record<string, string> | undefined) => {
		FlowRouter.go(name, parameters, queryStringParameters);
	};

	replaceRoute = (name: string, parameters: RouteParameters | undefined, queryStringParameters: QueryStringParameters | undefined) => {
		FlowRouter.withReplaceState(() => FlowRouter.go(name, parameters, queryStringParameters));
	};

	queryRouteParameter = (name: string) => {
		return { subscribe: this.subscribe, get: () => FlowRouter.current().params[name] };
	};

	queryQueryStringParameter = (name: string) => {
		return { subscribe: this.subscribe, get: () => FlowRouter.current().queryParams[name] };
	};

	queryCurrentRoute = () => {
		return { subscribe: this.subscribe, get: () => this.currentRoute };
	};
}

const RouterProvider: FC = ({ children }) => {
	const [router] = useState(() => new Router());

	useEffect(() => {
		router.setUp();
		return () => {
			router.tearDown();
		};
	}, [router]);

	return <RouterContext.Provider children={children} value={router} />;
};

export default RouterProvider;
