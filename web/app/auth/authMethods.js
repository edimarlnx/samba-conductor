import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { authenticateUser } from '../samba/sambaAuth';
import { storeCredentials, clearCredentials } from './credentialStore';

const DOMAIN_ADMINS_CN = 'CN=Domain Admins';

// Checks if user is member of Domain Admins group
function checkIsAdmin({ memberOf }) {
  const groups = Array.isArray(memberOf) ? memberOf : memberOf ? [memberOf] : [];
  return groups.some((dn) => dn.includes(DOMAIN_ADMINS_CN));
}

// Custom login handler for Samba AD authentication
Accounts.registerLoginHandler('samba', async function sambaLoginHandler({ sambaUsername, sambaPassword }) {
  if (!sambaUsername || !sambaPassword) {
    return undefined;
  }

  check(sambaUsername, String);
  check(sambaPassword, String);

  const adUser = await authenticateUser({ username: sambaUsername, password: sambaPassword });

  const memberOf = Array.isArray(adUser.memberOf)
    ? adUser.memberOf
    : adUser.memberOf
      ? [adUser.memberOf]
      : [];

  const isAdmin = checkIsAdmin({ memberOf });

  let user = await Meteor.users.findOneAsync({ username: sambaUsername });

  const profile = {
    displayName: adUser.displayName || sambaUsername,
    givenName: adUser.givenName || '',
    surname: adUser.sn || '',
    email: adUser.mail || '',
    dn: adUser.dn || adUser.distinguishedName || '',
    memberOf,
    isAdmin,
    mustChangePassword: adUser.expired === true,
    lastSyncedAt: new Date(),
  };

  if (user) {
    await Meteor.users.updateAsync(user._id, { $set: { profile } });
  } else {
    const userId = await Accounts.createUserAsync({
      username: sambaUsername,
      profile,
    });
    user = await Meteor.users.findOneAsync(userId);
  }

  // Store encrypted credentials in server memory for this session
  // Skip storing if password is expired (user must change it first)
  if (!adUser.expired) {
    storeCredentials({ userId: user._id, username: sambaUsername, password: sambaPassword });
  }

  return { userId: user._id };
});

// Clear credentials on logout
Meteor.methods({
  'auth.logout': function authLogout() {
    if (this.userId) {
      clearCredentials({ userId: this.userId });
    }
  },
});
