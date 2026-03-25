import crypto from 'crypto';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { SettingsCollection } from './SettingsCollection';
import { SETTINGS_DEFAULTS } from './settingsDefaults';
import { encryptForStorage, decryptFromStorage } from '../auth/credentialStore';
import { getCredentials } from '../auth/credentialStore';
import { createUser } from '../samba/sambaUsers';

const DEFAULT_SYNC_USERNAME = 'svc-conductor';

// Checks if the current user is an admin
function requireAdmin({ userId }) {
  if (!userId) {
    throw new Meteor.Error('not-authorized', 'You must be logged in');
  }

  const user = Promise.await(Meteor.users.findOneAsync(userId));
  if (!user?.profile?.isAdmin) {
    throw new Meteor.Error('not-authorized', 'Admin access required');
  }
}

// Generates a strong random password (32 chars, mixed)
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  const bytes = crypto.randomBytes(32);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
}

Meteor.methods({
  // Any logged-in user can read settings (passwords are never returned)
  'settings.get': async function getSettings({ key }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(key, String);

    const setting = await SettingsCollection.findOneAsync({ key });
    const value = setting?.value || SETTINGS_DEFAULTS[key] || null;

    // Strip encrypted password from sync account before returning
    if (key === 'sync.account' && value) {
      return {
        configured: value.configured || false,
        username: value.username || '',
      };
    }

    return value;
  },

  // Only admins can write settings
  'settings.set': async function setSettings({ key, value }) {
    requireAdmin({ userId: this.userId });
    check(key, String);
    check(value, Object);

    await SettingsCollection.upsertAsync({ key }, { $set: { key, value } });
    return { success: true };
  },

  // Create sync account in AD with auto-generated password, save encrypted in MongoDB
  // The admin never sees the password
  'settings.configureSyncAccount': async function configureSyncAccount({ username }) {
    requireAdmin({ userId: this.userId });
    check(username, String);

    const credentials = getCredentials({ userId: this.userId });
    const password = generatePassword();

    // Create the AD user via samba-tool using admin's session credentials
    try {
      await createUser({
        username,
        password,
        description: 'Samba Conductor sync service account',
        credentials,
      });
    } catch (error) {
      // If user already exists, try to reset their password instead
      if (error.message?.includes('already exists')) {
        const { resetPassword } = require('../samba/sambaUsers');
        await resetPassword({ username, newPassword: password, credentials });
      } else {
        throw error;
      }
    }

    // Encrypt and store the password
    const encryptedPassword = encryptForStorage({ text: password });

    await SettingsCollection.upsertAsync(
      { key: 'sync.account' },
      {
        $set: {
          key: 'sync.account',
          value: {
            configured: true,
            username,
            encryptedPassword,
          },
        },
      }
    );

    return { success: true, username };
  },

  // Reset sync account password (generates new password, admin never sees it)
  'settings.resetSyncPassword': async function resetSyncPassword() {
    requireAdmin({ userId: this.userId });

    const setting = await SettingsCollection.findOneAsync({ key: 'sync.account' });
    if (!setting?.value?.configured) {
      throw new Meteor.Error('not-configured', 'Sync account is not configured');
    }

    const credentials = getCredentials({ userId: this.userId });
    const newPassword = generatePassword();
    const { username } = setting.value;

    const { resetPassword } = require('../samba/sambaUsers');
    await resetPassword({ username, newPassword, credentials });

    const encryptedPassword = encryptForStorage({ text: newPassword });

    await SettingsCollection.updateAsync(
      { key: 'sync.account' },
      { $set: { 'value.encryptedPassword': encryptedPassword } }
    );

    return { success: true };
  },
});

// Utility for server-side sync jobs to get decrypted sync credentials
export async function getSyncCredentials() {
  const setting = await SettingsCollection.findOneAsync({ key: 'sync.account' });

  if (!setting?.value?.configured || !setting.value.encryptedPassword) {
    return null;
  }

  const password = decryptFromStorage(setting.value.encryptedPassword);
  return { username: setting.value.username, password };
}
