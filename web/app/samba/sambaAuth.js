import { Meteor } from 'meteor/meteor';
import { getSambaConfig } from './sambaConfig';
import { createLdapClient, ldapBind, ldapBindWithCredentials, ldapSearch, ldapDisconnect } from './sambaLdap';
import { runSambaTool } from './sambaExec';

// Authenticates a user against Samba AD via LDAP bind
// Returns user attributes on success, or { expired: true } if password must be changed
export async function authenticateUser({ username, password }) {
  const { realm, baseDn } = getSambaConfig();
  const upn = `${username}@${realm}`;

  const client = createLdapClient();

  try {
    await ldapBind({ client, dn: upn, password });

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

// Checks if a user has pwdLastSet=0 via samba-tool (no admin credentials needed)
// samba-tool runs on the DC with machine context (or via docker exec)
async function checkPasswordExpired({ username, baseDn }) {
  try {
    const { stdout } = await runSambaTool({
      args: ['user', 'show', username, '--attributes=pwdLastSet,displayName,memberOf,distinguishedName'],
    });

    // Parse samba-tool output
    const lines = stdout.split('\n');
    const attrs = {};
    lines.forEach((line) => {
      const match = line.match(/^(\S+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (attrs[key]) {
          if (!Array.isArray(attrs[key])) attrs[key] = [attrs[key]];
          attrs[key].push(value);
        } else {
          attrs[key] = value;
        }
      }
    });

    if (attrs.pwdLastSet === '0') {
      return {
        expired: true,
        sAMAccountName: username,
        displayName: attrs.displayName || username,
        memberOf: Array.isArray(attrs.memberOf) ? attrs.memberOf : attrs.memberOf ? [attrs.memberOf] : [],
        dn: attrs.dn || attrs.distinguishedName || '',
      };
    }

    return null;
  } catch (toolError) {
    console.error('[SambaAuth] samba-tool check failed:', toolError.message);
    return null;
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
