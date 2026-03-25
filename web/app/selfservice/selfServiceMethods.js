import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { getUser } from '../samba/sambaUsers';
import { updateUserAttributes } from '../samba/sambaUsers';
import { authenticateUser } from '../samba/sambaAuth';
import { resetPassword } from '../samba/sambaUsers';
import { SettingsCollection } from '../settings/SettingsCollection';
import { SETTINGS_DEFAULTS } from '../settings/settingsDefaults';

Meteor.methods({
  // Get own profile from AD
  'selfService.getProfile': async function getOwnProfile() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const meteorUser = await Meteor.users.findOneAsync(this.userId);
    if (!meteorUser?.username) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    return getUser({ username: meteorUser.username });
  },

  // Update own profile - only fields allowed by admin settings
  'selfService.updateProfile': async function updateOwnProfile({ fields }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(fields, Object);

    const meteorUser = await Meteor.users.findOneAsync(this.userId);
    if (!meteorUser?.username) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    // Get editable fields configuration
    const setting = await SettingsCollection.findOneAsync({ key: 'selfService.editableFields' });
    const editableFields = setting?.value || SETTINGS_DEFAULTS['selfService.editableFields'];

    // Filter to only allowed fields
    const allowedAttributes = {};
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

    // Verify current password via LDAP bind (skip if mustChangePassword)
    if (!meteorUser.profile?.mustChangePassword) {
      await authenticateUser({ username: meteorUser.username, password: currentPassword });
    }

    // Set new password via samba-tool
    await resetPassword({ username: meteorUser.username, newPassword });

    // Clear mustChangePassword flag
    if (meteorUser.profile?.mustChangePassword) {
      await Meteor.users.updateAsync(this.userId, {
        $set: { 'profile.mustChangePassword': false },
      });
    }

    return { success: true };
  },
});
