import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { SettingsCollection } from './SettingsCollection';
import { SETTINGS_DEFAULTS } from './settingsDefaults';
import { encryptForStorage, decryptFromStorage } from '../auth/credentialStore';
import { authenticateUser } from '../samba/sambaAuth';

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

  // Configure sync account — validates credentials first, then stores encrypted
  'settings.configureSyncAccount': async function configureSyncAccount({ username, password }) {
    requireAdmin({ userId: this.userId });
    check(username, String);
    check(password, String);

    // Validate credentials by attempting LDAP bind
    await authenticateUser({ username, password });

    // Encrypt password for persistent storage
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
