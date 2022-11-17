import { MongoInternals } from 'meteor/mongo';

import { watcher } from '../database/DatabaseWatcher';
import { db } from '../database/utils';
import { initWatchers } from '../modules/watchers/watchers.module';
import { api } from '../sdk/api';
import { metrics } from '../../app/metrics/server/lib/metrics';
import { SystemLogger } from '../lib/logger/system';

const { mongo } = MongoInternals.defaultRemoteCollectionDriver();

watcher
	.setDb(db)
	.setMetrics(metrics)
	.setOplogHandle((mongo as any)._oplogHandle);

initWatchers(watcher, api.broadcastLocal.bind(api));

watcher.watch();

setInterval(function _checkDatabaseWatcher() {
	if (watcher.isLastDocDelayed()) {
		SystemLogger.error('No real time data received recently');
	}
}, 20000);

export function isLastDocDelayed(): boolean {
	return watcher.isLastDocDelayed();
}
