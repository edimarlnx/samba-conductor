import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { getReadCredentials, getWriteCredentials } from '../auth/credentialStore';
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
  // READ — fallback to sync account
  'samba.users.list': async function listADUsers() {
    const credentials = await getReadCredentials({ userId: this.userId });
    return listUsers({ credentials });
  },

  // READ — fallback to sync account
  'samba.users.get': async function getADUser({ username }) {
    const credentials = await getReadCredentials({ userId: this.userId });
    check(username, String);
    return getUser({ username, credentials });
  },

  // WRITE — requires active session
  'samba.users.create': async function createADUser({
    username, password, givenName, surname, initials, mail,
    company, department, description, telephoneNumber,
    physicalDeliveryOffice, userou, mustChangeAtNextLogin,
    unixHome, loginShell, uidNumber, gidNumber,
  }) {
    const credentials = getWriteCredentials({ userId: this.userId });
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
      unixHome, loginShell, uidNumber, gidNumber, credentials,
    });
    return { success: true };
  },

  // WRITE — requires active session
  'samba.users.delete': async function deleteADUser({ username }) {
    const credentials = getWriteCredentials({ userId: this.userId });
    check(username, String);
    await deleteUser({ username, credentials });
    return { success: true };
  },

  // WRITE — requires active session
  'samba.users.enable': async function enableADUser({ username }) {
    const credentials = getWriteCredentials({ userId: this.userId });
    check(username, String);
    await enableUser({ username, credentials });
    return { success: true };
  },

  // WRITE — requires active session
  'samba.users.disable': async function disableADUser({ username }) {
    const credentials = getWriteCredentials({ userId: this.userId });
    check(username, String);
    await disableUser({ username, credentials });
    return { success: true };
  },

    // WRITE — move user to different OU
    'samba.users.move': async function moveADUser({username, newOuDn}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(username, String);
        check(newOuDn, String);
        const {moveUser} = require('../samba/sambaUsers');
        await moveUser({username, newOuDn, credentials});
        return {success: true};
    },

  // WRITE — requires active session
  'samba.users.resetPassword': async function resetADUserPassword({ username, newPassword }) {
    const credentials = getWriteCredentials({ userId: this.userId });
    check(username, String);
    check(newPassword, String);
    await resetPassword({ username, newPassword, credentials });
    return { success: true };
  },
});
