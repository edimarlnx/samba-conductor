import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { SettingsCollection } from './SettingsCollection';
import { SETTINGS_DEFAULTS } from './settingsDefaults';

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
  // Any logged-in user can read settings
  'settings.get': async function getSettings({ key }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(key, String);

    const setting = await SettingsCollection.findOneAsync({ key });
    if (setting) {
      return setting.value;
    }

    // Return default if no record exists
    return SETTINGS_DEFAULTS[key] || null;
  },

  // Only admins can write settings
  'settings.set': async function setSettings({ key, value }) {
    requireAdmin({ userId: this.userId });
    check(key, String);
    check(value, Object);

    await SettingsCollection.upsertAsync({ key }, { $set: { key, value } });
    return { success: true };
  },
});
