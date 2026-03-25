import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { authenticateUser } from '../samba/sambaAuth';

// Custom login handler for Samba AD authentication
Accounts.registerLoginHandler('samba', async function sambaLoginHandler({ sambaUsername, sambaPassword }) {
  if (!sambaUsername || !sambaPassword) {
    return undefined;
  }

  check(sambaUsername, String);
  check(sambaPassword, String);

  const adUser = await authenticateUser({ username: sambaUsername, password: sambaPassword });

  // Find or create the Meteor user linked to this AD account
  let user = await Meteor.users.findOneAsync({ username: sambaUsername });

  const profile = {
    displayName: adUser.displayName || sambaUsername,
    givenName: adUser.givenName || '',
    surname: adUser.sn || '',
    email: adUser.mail || '',
    dn: adUser.dn || adUser.distinguishedName || '',
    memberOf: Array.isArray(adUser.memberOf)
      ? adUser.memberOf
      : adUser.memberOf
        ? [adUser.memberOf]
        : [],
    lastSyncedAt: new Date(),
  };

  if (user) {
    // Update existing user profile with latest AD data
    await Meteor.users.updateAsync(user._id, { $set: { profile } });
  } else {
    // Create a new Meteor user for this AD account
    const userId = await Accounts.createUserAsync({
      username: sambaUsername,
      profile,
    });
    user = await Meteor.users.findOneAsync(userId);
  }

  return { userId: user._id };
});
