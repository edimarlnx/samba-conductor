import { Meteor } from 'meteor/meteor';
import { getSambaConfig } from './sambaConfig';
import { createLdapClient, ldapBind, ldapBindAsAdmin, ldapSearch, ldapDisconnect } from './sambaLdap';

// Authenticates a user against Samba AD via LDAP bind
// Returns user attributes on success, or { expired: true } if password is expired
export async function authenticateUser({ username, password }) {
  const { realm, baseDn } = getSambaConfig();
  const upn = `${username}@${realm}`;

  const client = createLdapClient();

  try {
    // Bind as the user to verify credentials
    await ldapBind({ client, dn: upn, password });

    // Fetch user attributes after successful bind
    const users = await ldapSearch({
      client,
      baseDn,
      filter: `(sAMAccountName=${ldapEscapeFilter({ value: username })})`,
      attributes: [
        'sAMAccountName',
        'displayName',
        'givenName',
        'sn',
        'mail',
        'memberOf',
        'userAccountControl',
        'distinguishedName',
      ],
    });

    if (users.length === 0) {
      throw new Meteor.Error('samba.auth.failed', 'User not found in directory');
    }

    return users[0];
  } catch (error) {
    // Detect password expired error from AD
    // AD error data 773 = user must reset password
    // AD error data 532 = password expired
    const errorMsg = error.message || '';
    const isExpired = errorMsg.includes('data 773')
      || errorMsg.includes('data 532')
      || errorMsg.includes('PASSWORD_EXPIRED')
      || errorMsg.includes('must change password');

    if (isExpired) {
      // Fetch user attributes using admin bind so we can create the session
      const adminClient = createLdapClient();
      try {
        await ldapBindAsAdmin({ client: adminClient });

        const users = await ldapSearch({
          client: adminClient,
          baseDn,
          filter: `(sAMAccountName=${ldapEscapeFilter({ value: username })})`,
          attributes: ['sAMAccountName', 'displayName', 'memberOf', 'distinguishedName'],
        });

        return {
          expired: true,
          sAMAccountName: username,
          displayName: users[0]?.displayName || username,
          memberOf: users[0]?.memberOf || [],
          dn: users[0]?.dn || '',
        };
      } finally {
        ldapDisconnect({ client: adminClient });
      }
    }

    throw error;
  } finally {
    ldapDisconnect({ client });
  }
}

// Escapes special characters in LDAP filter values
function ldapEscapeFilter({ value }) {
  return value
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\0/g, '\\00');
}
