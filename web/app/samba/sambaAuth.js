import { Meteor } from 'meteor/meteor';
import { getSambaConfig } from './sambaConfig';
import { createLdapClient, ldapBind, ldapBindAsAdmin, ldapSearch, ldapDisconnect } from './sambaLdap';

// Authenticates a user against Samba AD via LDAP bind
// Returns user attributes on success, or { expired: true } if password must be changed
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
    // On InvalidCredentials (code 49), check if it's actually a must-change-password
    // Samba over LDAPS doesn't include sub-error codes (data 773), so we check pwdLastSet
    const isInvalidCreds = error.message?.includes('Invalid Credentials')
      || error.message?.includes('data 773')
      || error.message?.includes('data 532')
      || error.message?.includes('PASSWORD_EXPIRED');

    if (isInvalidCreds) {
      const expiredResult = await checkPasswordExpired({ username, baseDn });
      if (expiredResult) {
        return expiredResult;
      }
    }

    throw error;
  } finally {
    ldapDisconnect({ client });
  }
}

// Checks if a user has pwdLastSet=0 (must change password) via admin bind
// Returns expired user object if true, null otherwise
async function checkPasswordExpired({ username, baseDn }) {
  const adminClient = createLdapClient();

  try {
    await ldapBindAsAdmin({ client: adminClient });

    const users = await ldapSearch({
      client: adminClient,
      baseDn,
      filter: `(sAMAccountName=${ldapEscapeFilter({ value: username })})`,
      attributes: [
        'sAMAccountName',
        'displayName',
        'memberOf',
        'distinguishedName',
        'pwdLastSet',
        'userAccountControl',
      ],
    });

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // pwdLastSet=0 means user must change password at next login
    if (user.pwdLastSet === '0') {
      return {
        expired: true,
        sAMAccountName: username,
        displayName: user.displayName || username,
        memberOf: user.memberOf || [],
        dn: user.dn || '',
      };
    }

    // Not expired — it was genuinely invalid credentials
    return null;
  } catch (adminError) {
    // If admin bind fails, we can't check — treat as regular auth failure
    console.error('[SambaAuth] Admin bind failed during expiry check:', adminError.message);
    return null;
  } finally {
    ldapDisconnect({ client: adminClient });
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
