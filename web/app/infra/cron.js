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

// S3 Backup — configurable schedule, checks if enabled
SyncedCron.add({
  name: 'DR: S3 Backup',
  schedule(parser) {
    return parser.text('every 1 hour');
  },
  async job() {
    const { SettingsCollection } = require('../settings/SettingsCollection');
    const setting = await SettingsCollection.findOneAsync({ key: 'backup.s3' });
    const config = setting?.value;

    if (!config?.configured || !config?.enabled) {
      return;
    }

    if (!isDrKeyUnlocked()) {
      console.log('[Cron] S3 backup skipped: DR Key not unlocked');
      return;
    }

    // Check if enough time has passed since last backup
    const lastRun = await SettingsCollection.findOneAsync({ key: 'backup.lastRun' });
    if (lastRun?.value?.timestamp) {
      const hoursSinceLast = (Date.now() - new Date(lastRun.value.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < (config.scheduleHours || 6)) {
        return;
      }
    }

    try {
      const { runBackup } = require('../dr/drBackup');
      const result = await runBackup({
        includeMongo: config.includeMongoDump !== false,
        includeSamba: config.includeSambaBackup !== false,
      });
      console.log(`[Cron] S3 backup completed: ${result.uploads.length} files uploaded`);
    } catch (error) {
      console.error('[Cron] S3 backup failed:', error.message);
    }
  },
});

SyncedCron.start();
