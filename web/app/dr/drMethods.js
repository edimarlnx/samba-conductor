import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { getCredentials } from '../auth/credentialStore';
import {
  configureDrKey,
  unlockDrKey,
  isDrKeyConfigured,
  isDrKeyUnlocked,
  generateDrKeyString,
} from '../auth/drKeyStore';
import { AdSnapshotCollection } from './AdSnapshotCollection';
import { runFullSync, syncUserHashes } from './drSync';
import { restoreUsers, restoreGroups, getRestorePreview } from './drRestore';
import { runBackup, testS3Connection } from './drBackup';
import { drEncrypt } from '../auth/drKeyStore';
import { SettingsCollection } from '../settings/SettingsCollection';
import { SETTINGS_DEFAULTS } from '../settings/settingsDefaults';

// Checks admin access
async function requireAdmin({ userId }) {
  if (!userId) {
    throw new Meteor.Error('not-authorized', 'You must be logged in');
  }
  const user = await Meteor.users.findOneAsync(userId);
  if (!user?.profile?.isAdmin) {
    throw new Meteor.Error('not-authorized', 'Admin access required');
  }
}

Meteor.methods({
  // Get DR status (key, sync, backup)
  'dr.getStatus': async function getDrStatus() {
    await requireAdmin({ userId: this.userId });

    const configured = await isDrKeyConfigured();
    const unlocked = isDrKeyUnlocked();

    const usersSnap = await AdSnapshotCollection.findOneAsync({ type: 'users' });
    const groupsSnap = await AdSnapshotCollection.findOneAsync({ type: 'groups' });
    const hashesSnap = await AdSnapshotCollection.findOneAsync({ type: 'hashes' });
    const domainSnap = await AdSnapshotCollection.findOneAsync({ type: 'domain' });

    const backupConfig = await SettingsCollection.findOneAsync({ key: 'backup.s3' });
    const lastBackup = await SettingsCollection.findOneAsync({ key: 'backup.lastRun' });

    return {
      drKey: { configured, unlocked },
      lastSync: {
        users: usersSnap?.snapshotAt || null,
        groups: groupsSnap?.snapshotAt || null,
        hashes: hashesSnap?.snapshotAt || null,
        domain: domainSnap?.snapshotAt || null,
      },
      counts: {
        users: usersSnap?.data?.length || 0,
        groups: groupsSnap?.data?.length || 0,
        hashes: hashesSnap?.data?.[0]?.count || 0,
      },
      backup: {
        configured: backupConfig?.value?.configured || false,
        enabled: backupConfig?.value?.enabled || false,
        lastRun: lastBackup?.value || null,
      },
    };
  },

  // Generate a new DR key (returns it once — client must save it)
  'dr.generateKey': async function generateKey() {
    await requireAdmin({ userId: this.userId });
    return generateDrKeyString();
  },

  // Configure DR key (first time setup)
  'dr.configureKey': async function configureKey({ key }) {
    await requireAdmin({ userId: this.userId });
    check(key, String);
    await configureDrKey({ key });
    return { success: true };
  },

  // Unlock DR key (after server restart)
  'dr.unlockKey': async function unlockKey({ key }) {
    await requireAdmin({ userId: this.userId });
    check(key, String);
    await unlockDrKey({ key });
    return { success: true };
  },

  // Trigger manual metadata sync
  'dr.triggerSync': async function triggerSync() {
    await requireAdmin({ userId: this.userId });
    const credentials = getCredentials({ userId: this.userId });
    return runFullSync({ credentials });
  },

  // Trigger manual hash sync
  'dr.triggerHashSync': async function triggerHashSync() {
    await requireAdmin({ userId: this.userId });
    const credentials = getCredentials({ userId: this.userId });
    return syncUserHashes({ credentials });
  },

  // Get restore preview
  'dr.getRestorePreview': async function getPreview() {
    await requireAdmin({ userId: this.userId });
    return getRestorePreview();
  },

  // Restore users from snapshot
  'dr.restoreUsers': async function restoreUsersMethod({ includeHashes }) {
    await requireAdmin({ userId: this.userId });
    const credentials = getCredentials({ userId: this.userId });
    return restoreUsers({ credentials, includeHashes });
  },

  // Restore groups from snapshot
  'dr.restoreGroups': async function restoreGroupsMethod() {
    await requireAdmin({ userId: this.userId });
    const credentials = getCredentials({ userId: this.userId });
    return restoreGroups({ credentials });
  },

  // Configure S3 backup — test connection, encrypt secret, save
  'dr.configureS3': async function configureS3({
    endpoint, bucket, region, accessKeyId, secretAccessKey, prefix,
    includeMongoDump, includeSambaBackup, retentionDays, scheduleHours, enabled,
  }) {
    await requireAdmin({ userId: this.userId });
    check(bucket, String);
    check(accessKeyId, String);
    check(secretAccessKey, String);

    // Test connection first
    await testS3Connection({ endpoint, bucket, region, accessKeyId, secretAccessKey });

    // Encrypt secret key with DR Key
    const encryptedSecretKey = drEncrypt({ text: secretAccessKey });

    await SettingsCollection.upsertAsync(
      { key: 'backup.s3' },
      {
        $set: {
          key: 'backup.s3',
          value: {
            configured: true,
            endpoint: endpoint || '',
            bucket,
            region: region || 'us-east-1',
            accessKeyId,
            encryptedSecretKey,
            prefix: prefix || 'samba-conductor/',
            includeMongoDump: includeMongoDump !== false,
            includeSambaBackup: includeSambaBackup !== false,
            retentionDays: retentionDays || 30,
            scheduleHours: scheduleHours || 6,
            enabled: enabled || false,
          },
        },
      }
    );

    return { success: true };
  },

  // Get S3 config (without secret key)
  'dr.getS3Config': async function getS3Config() {
    await requireAdmin({ userId: this.userId });

    const setting = await SettingsCollection.findOneAsync({ key: 'backup.s3' });
    const config = setting?.value || SETTINGS_DEFAULTS['backup.s3'];

    return {
      configured: config.configured || false,
      endpoint: config.endpoint || '',
      bucket: config.bucket || '',
      region: config.region || 'us-east-1',
      accessKeyId: config.accessKeyId || '',
      prefix: config.prefix || 'samba-conductor/',
      includeMongoDump: config.includeMongoDump !== false,
      includeSambaBackup: config.includeSambaBackup !== false,
      retentionDays: config.retentionDays || 30,
      scheduleHours: config.scheduleHours || 6,
      enabled: config.enabled || false,
    };
  },

  // Trigger manual backup
  'dr.triggerBackup': async function triggerBackup({ includeMongo, includeSamba }) {
    await requireAdmin({ userId: this.userId });
    return runBackup({
      includeMongo: includeMongo !== false,
      includeSamba: includeSamba !== false,
    });
  },
});
