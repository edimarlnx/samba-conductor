import { getSambaConfig } from './sambaConfig';
import { createLdapClient, ldapBind, ldapSearch, ldapDisconnect } from './sambaLdap';

// Authenticates a user against Samba AD via LDAP bind
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
      throw new Error('User not found in directory after successful bind');
    }

    return users[0];
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
