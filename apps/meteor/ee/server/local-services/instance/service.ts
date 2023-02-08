import os from 'os';

import { ServiceBroker } from 'moleculer';
import { License, ServiceClassInternal } from '@rocket.chat/core-services';
import { InstanceStatus as InstanceStatusRaw } from '@rocket.chat/models';
import { InstanceStatus } from 'meteor/konecty:multiple-instances-status';

import { StreamerCentral } from '../../../../server/modules/streamer/streamer.module';

export class InstanceService extends ServiceClassInternal {
	protected name = 'instance';

	private broadcastStarted = false;

	private broker: ServiceBroker;

	constructor() {
		super();

		this.onEvent('watch.instanceStatus', async ({ clientAction, data }): Promise<void> => {
			if (clientAction === 'removed') {
				return;
			}

			if (clientAction === 'inserted' && data?.extraInformation?.port) {
				this.connectNode(data);
			}
		});

		this.onEvent('license.module', ({ module, valid }) => {
			if (module === 'scalability' && valid) {
				this.startBroadcast();
			}
		});
	}

	async created() {
		const port = process.env.TCP_PORT ? String(process.env.TCP_PORT).trim() : 0;

		this.broker = new ServiceBroker({
			transporter: {
				type: 'TCP',
				options: {
					port,
					udpDiscovery: false,
				},
			},
		});

		this.broker.createService({
			name: 'matrix',
			events: {
				broadcast(ctx: any) {
					const { eventName, streamName, args } = ctx.params;

					const instance = StreamerCentral.instances[streamName];
					if (!instance) {
						return 'stream-not-exists';
					}

					if (instance.serverOnly) {
						instance.__emit(eventName, ...args);
					} else {
						// @ts-expect-error not sure why it thinks _emit needs an extra argument
						StreamerCentral.instances[streamName]._emit(eventName, args);
					}
				},
			},
		});
	}

	async started() {
		await this.broker.start();

		const instance = {
			host: process.env.INSTANCE_IP ? String(process.env.INSTANCE_IP).trim() : 'localhost',
			port: String(process.env.PORT).trim(),
			tcpPort: (this.broker.transit?.tx as any)?.nodes?.localNode?.port,
			os: {
				type: os.type(),
				platform: os.platform(),
				arch: os.arch(),
				release: os.release(),
				uptime: os.uptime(),
				loadavg: os.loadavg(),
				totalmem: os.totalmem(),
				freemem: os.freemem(),
				cpus: os.cpus().length,
			},
			nodeVersion: process.version,
		};

		InstanceStatus.registerInstance('rocket.chat', instance);

		const hasLicense = await License.hasLicense('scalability');
		if (!hasLicense) {
			return;
		}

		this.startBroadcast();
	}

	private startBroadcast() {
		if (this.broadcastStarted) {
			return;
		}

		this.broadcastStarted = true;

		StreamerCentral.on('broadcast', this.sendBroadcast.bind(this));

		InstanceStatusRaw.find(
			{
				'extraInformation.tcpPort': {
					$exists: true,
				},
			},
			{
				sort: {
					_createdAt: -1,
				},
			},
		).forEach(this.connectNode.bind(this));
	}

	private connectNode(record: any) {
		if (record._id === InstanceStatus.id()) {
			return;
		}

		const { host, tcpPort } = record.extraInformation;

		(this.broker?.transit?.tx as any).addOfflineNode(record._id, host, tcpPort);
	}

	private sendBroadcast(streamName: string, eventName: string, args: unknown[]) {
		this.broker.broadcast('broadcast', { streamName, eventName, args });
	}
}

// TODO missing implementation of disable instance broadcast
// let TroubleshootDisableInstanceBroadcast;
// settings.watch('Troubleshoot_Disable_Instance_Broadcast', (value) => {
// 	if (TroubleshootDisableInstanceBroadcast === value) {
// 		return;
// 	}
// 	TroubleshootDisableInstanceBroadcast = value;

// 	if (value) {
// 		return StreamerCentral.removeListener('broadcast', onBroadcast);
// 	}

// 	// TODO move to a service and stop using StreamerCentral
// 	StreamerCentral.on('broadcast', onBroadcast);
// });