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
  // Get DR status (key configured/unlocked, last sync times)
  'dr.getStatus': async function getDrStatus() {
    await requireAdmin({ userId: this.userId });

    const configured = await isDrKeyConfigured();
    const unlocked = isDrKeyUnlocked();

    const usersSnap = await AdSnapshotCollection.findOneAsync({ type: 'users' });
    const groupsSnap = await AdSnapshotCollection.findOneAsync({ type: 'groups' });
    const hashesSnap = await AdSnapshotCollection.findOneAsync({ type: 'hashes' });
    const domainSnap = await AdSnapshotCollection.findOneAsync({ type: 'domain' });

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
});
