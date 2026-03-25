import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import {
  listUsers,
  getUser,
  createUser,
  deleteUser,
  enableUser,
  disableUser,
  resetPassword,
} from '../samba/sambaUsers';

Meteor.methods({
  'samba.users.list': async function listADUsers() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    return listUsers();
  },

  'samba.users.get': async function getADUser({ username }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(username, String);
    return getUser({ username });
  },

  'samba.users.create': async function createADUser({ username, password, givenName, surname, mail }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(username, String);
    check(password, String);
    check(givenName, Match.Maybe(String));
    check(surname, Match.Maybe(String));
    check(mail, Match.Maybe(String));

    await createUser({ username, password, givenName, surname, mail });
    return { success: true };
  },

  'samba.users.delete': async function deleteADUser({ username }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(username, String);

    await deleteUser({ username });
    return { success: true };
  },

  'samba.users.enable': async function enableADUser({ username }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(username, String);

    await enableUser({ username });
    return { success: true };
  },

  'samba.users.disable': async function disableADUser({ username }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(username, String);

    await disableUser({ username });
    return { success: true };
  },

  'samba.users.resetPassword': async function resetADUserPassword({ username, newPassword }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(username, String);
    check(newPassword, String);

    await resetPassword({ username, newPassword });
    return { success: true };
  },
});
