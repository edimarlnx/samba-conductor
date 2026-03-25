import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { getCredentials, storeCredentials } from '../auth/credentialStore';
import { getUser, updateUserAttributes, resetPassword } from '../samba/sambaUsers';
import { authenticateUser } from '../samba/sambaAuth';
import { SettingsCollection } from '../settings/SettingsCollection';
import { SETTINGS_DEFAULTS } from '../settings/settingsDefaults';

Meteor.methods({
  // Get own profile from AD using own session credentials
  'selfService.getProfile': async function getOwnProfile() {
    const credentials = getCredentials({ userId: this.userId });

    const meteorUser = await Meteor.users.findOneAsync(this.userId);
    if (!meteorUser?.username) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    return getUser({ username: meteorUser.username, credentials });
  },

  // Update own profile — only fields allowed by admin settings
  'selfService.updateProfile': async function updateOwnProfile({ fields }) {
    const credentials = getCredentials({ userId: this.userId });
    check(fields, Object);

    const meteorUser = await Meteor.users.findOneAsync(this.userId);
    if (!meteorUser?.username) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    const setting = await SettingsCollection.findOneAsync({ key: 'selfService.editableFields' });
    const editableFields = setting?.value || SETTINGS_DEFAULTS['selfService.editableFields'];

    const fieldToAdAttribute = {
      givenName: 'givenName',
      surname: 'sn',
      mail: 'mail',
      telephoneNumber: 'telephoneNumber',
      description: 'description',
      company: 'company',
      department: 'department',
      physicalDeliveryOffice: 'physicalDeliveryOfficeName',
    };

    const allowedAttributes = {};
    Object.entries(fields).forEach(([key, value]) => {
      if (editableFields[key]?.enabled && fieldToAdAttribute[key]) {
        allowedAttributes[fieldToAdAttribute[key]] = value;
      }
    });

    if (Object.keys(allowedAttributes).length === 0) {
      throw new Meteor.Error('no-fields', 'No editable fields provided');
    }

    await updateUserAttributes({
      username: meteorUser.username,
      attributes: allowedAttributes,
      credentials,
    });

    return { success: true };
  },

  // Change own password
  'selfService.changePassword': async function changeOwnPassword({ currentPassword, newPassword }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(currentPassword, String);
    check(newPassword, String);

    const meteorUser = await Meteor.users.findOneAsync(this.userId);
    if (!meteorUser?.username) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    const mustChange = meteorUser.profile?.mustChangePassword;

    // Verify current password via LDAP bind (skip if forced change)
    if (!mustChange) {
      await authenticateUser({ username: meteorUser.username, password: currentPassword });
    }

    // Use current password as credentials for samba-tool, or no credentials if forced change
    const credentials = mustChange
      ? undefined
      : { username: meteorUser.username, password: currentPassword };

    await resetPassword({ username: meteorUser.username, newPassword, credentials });

    // Clear mustChangePassword flag and store new credentials in session
    await Meteor.users.updateAsync(this.userId, {
      $set: { 'profile.mustChangePassword': false },
    });

    storeCredentials({ userId: this.userId, username: meteorUser.username, password: newPassword });

    return { success: true };
  },
});
