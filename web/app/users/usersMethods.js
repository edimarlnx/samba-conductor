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

  'samba.users.create': async function createADUser({
    username, password, givenName, surname, initials, mail,
    company, department, description, telephoneNumber,
    physicalDeliveryOffice, userou, mustChangeAtNextLogin,
    unixHome, loginShell, uidNumber, gidNumber,
  }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(username, String);
    check(password, String);

    const optionalString = Match.Maybe(String);
    check(givenName, optionalString);
    check(surname, optionalString);
    check(initials, optionalString);
    check(mail, optionalString);
    check(company, optionalString);
    check(department, optionalString);
    check(description, optionalString);
    check(telephoneNumber, optionalString);
    check(physicalDeliveryOffice, optionalString);
    check(userou, optionalString);
    check(mustChangeAtNextLogin, Match.Maybe(Boolean));
    check(unixHome, optionalString);
    check(loginShell, optionalString);
    check(uidNumber, optionalString);
    check(gidNumber, optionalString);

    await createUser({
      username, password, givenName, surname, initials, mail,
      company, department, description, telephoneNumber,
      physicalDeliveryOffice, userou, mustChangeAtNextLogin,
      unixHome, loginShell, uidNumber, gidNumber,
    });
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
