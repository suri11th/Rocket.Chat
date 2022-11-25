import type { IServiceClass } from '../../../../apps/meteor/server/sdk/types/ServiceClass';
import { ServiceClass } from '../../../../apps/meteor/server/sdk/types/ServiceClass';
import { initWatchers } from '../../../../apps/meteor/server/modules/watchers/watchers.module';
import type { DatabaseWatcher } from '../../../../apps/meteor/server/database/DatabaseWatcher';

export class StreamHub extends ServiceClass implements IServiceClass {
	protected name = 'hub';

	constructor(private watcher: DatabaseWatcher) {
		super();
	}

	async created(): Promise<void> {
		this.watcher.setBroadcast(this.api.broadcast.bind(this.api));
		initWatchers(this.watcher);

		this.watcher.watch();
	}
}
