import { SyncedCron } from 'meteor/quave:synced-cron';
import { isDrKeyUnlocked } from '../auth/drKeyStore';
import { getSyncCredentials } from '../settings/settingsMethods';
import { runFullSync, syncUserHashes } from '../dr/drSync';

// Metadata sync: users, groups, domain — every 15 minutes
SyncedCron.add({
  name: 'DR: Sync AD metadata',
  schedule(parser) {
    return parser.text('every 15 minutes');
  },
  async job() {
    const credentials = await getSyncCredentials();
    if (!credentials) {
      console.log('[Cron] Sync skipped: sync account not configured');
      return;
    }

    try {
      const results = await runFullSync({ credentials });
      console.log('[Cron] AD metadata sync completed:', JSON.stringify(results));
    } catch (error) {
      console.error('[Cron] AD metadata sync failed:', error.message);
    }
  },
});

// Hash sync: password hashes — every 6 hours
SyncedCron.add({
  name: 'DR: Sync password hashes',
  schedule(parser) {
    return parser.text('every 6 hours');
  },
  async job() {
    if (!isDrKeyUnlocked()) {
      console.log('[Cron] Hash sync skipped: DR Key not unlocked');
      return;
    }

    const credentials = await getSyncCredentials();
    if (!credentials) {
      console.log('[Cron] Hash sync skipped: sync account not configured');
      return;
    }

    try {
      const result = await syncUserHashes({ credentials });
      console.log(`[Cron] Hash sync completed: ${result.count} users`);
    } catch (error) {
      console.error('[Cron] Hash sync failed:', error.message);
    }
  },
});

SyncedCron.start();
