import type { Subscribable } from '@rocket.chat/core-typings';
import { Emitter } from '@rocket.chat/emitter';
import type { RouteGroup, RouterContextValue, Route } from '@rocket.chat/ui-contexts';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Tracker } from 'meteor/tracker';

class FlowRouterRouteGroup implements RouteGroup {
	public prefix: string;

	public name: string | undefined;

	protected emitter: Emitter<{ update: void }>;

	public routes: Subscribable<Route[]> & {
		cache: Route[];
	};

	public constructor({ prefix, name, emitter }: { prefix: string; name: string | undefined; emitter: Emitter<{ update: void }> }) {
		this.prefix = prefix;
		this.name = name;
		this.emitter = emitter;

		this.routes = {
			subscribe: this.emitter.on.bind(this.emitter, 'update'),
			get: () => this.routes.cache,
			cache: [],
		};
	}

	register(pathDef: string, { action, name }: { action: () => void; name?: string }): () => void {
		const route = FlowRouter.route(this.prefix + pathDef, { action, name });

		if (FlowRouter._initialized) {
			FlowRouter.reload();
		}

		const _route = { pathDef, action, name };
		this.routes.cache.push(_route);

		this.emitter.emit('update');

		return () => {
			FlowRouter._routes = FlowRouter._routes.filter((r) => r !== route);
			if (route.name) {
				delete FlowRouter._routesMap[route.name];
			}

			if (FlowRouter._initialized) {
				FlowRouter._updateCallbacks();
				FlowRouter.reload();
			}

			this.routes.cache = this.routes.cache.filter((r) => r !== _route);
			this.emitter.emit('update');
		};
	}

	unregister(pathDef: string): void {
		const route = FlowRouter._routes.find((route) => route.path === this.prefix + pathDef);

		if (!route) {
			return;
		}

		FlowRouter._routes = FlowRouter._routes.filter((r) => r !== route);
		if (route.name) {
			delete FlowRouter._routesMap[route.name];
		}

		if (FlowRouter._initialized) {
			FlowRouter._updateCallbacks();
			FlowRouter.reload();
		}

		this.routes.cache = this.routes.cache.filter((r) => r.action !== route.options.action);
		this.emitter.emit('update');
	}

	private _groups = new Map<string, RouteGroup>();

	group(prefix: string, name?: string): RouteGroup {
		const group = this._groups.get(prefix) ?? new FlowRouterRouteGroup({ prefix: this.prefix + prefix, name, emitter: this.emitter });
		this._groups.set(prefix, group);
		return group;
	}
}

class FlowRouterRouter extends FlowRouterRouteGroup implements RouterContextValue {
	private computation: Tracker.Computation;

	private currentRoute = this.createCurrentRoute();

	public constructor() {
		super({ prefix: '', name: undefined, emitter: new Emitter() });
	}

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

	pushRoute = (name: string, parameters?: Record<string, string>, queryStringParameters?: Record<string, string>) => {
		FlowRouter.go(name, parameters, queryStringParameters);
	};

	replaceRoute = (name: string, parameters?: Record<string, string>, queryStringParameters?: Record<string, string>) => {
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

	go(
		pathDef: string,
		params?: Record<string, string>,
		{
			replace = false,
			queryParams = FlowRouter.current().queryParams,
		}: { replace?: boolean; queryParams?: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>) } = {},
	) {
		const go = () =>
			FlowRouter.go(pathDef, params, typeof queryParams === 'function' ? queryParams(FlowRouter.current().queryParams) : queryParams);

		setTimeout(() => {
			if (replace) {
				FlowRouter.withReplaceState(go);
			} else {
				go();
			}
		}, 0);
	}

	currentPathDef = {
		subscribe: this.subscribe,
		get: () => FlowRouter.current().route?.pathDef ?? '*',
	};

	currentRouteName = {
		subscribe: this.subscribe,
		get: () => FlowRouter.current().route?.name,
	};

	params = {
		subscribe: this.subscribe,
		get: () => FlowRouter.current().params,
	};

	queryParams = {
		subscribe: this.subscribe,
		get: () => FlowRouter.current().queryParams,
	};
}

export const router = new FlowRouterRouter();
