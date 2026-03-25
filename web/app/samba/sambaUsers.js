import { getSambaConfig } from './sambaConfig';
import { createLdapClient, ldapBindAsAdmin, ldapSearch, ldapDisconnect } from './sambaLdap';
import { runSambaTool } from './sambaExec';

// Lists all AD users with their attributes
export async function listUsers() {
  const client = createLdapClient();
  const { baseDn } = getSambaConfig();

  try {
    await ldapBindAsAdmin({ client });

    const users = await ldapSearch({
      client,
      baseDn,
      filter: '(&(objectClass=user)(objectCategory=person))',
      attributes: [
        'sAMAccountName',
        'displayName',
        'givenName',
        'sn',
        'mail',
        'userAccountControl',
        'whenCreated',
        'lastLogonTimestamp',
        'distinguishedName',
      ],
    });

    return users.map((user) => ({
      username: user.sAMAccountName,
      displayName: user.displayName || '',
      givenName: user.givenName || '',
      surname: user.sn || '',
      email: user.mail || '',
      enabled: !isAccountDisabled({ userAccountControl: user.userAccountControl }),
      dn: user.dn,
      whenCreated: user.whenCreated || '',
      lastLogon: user.lastLogonTimestamp || '',
    }));
  } finally {
    ldapDisconnect({ client });
  }
}

// Gets a single AD user by username
export async function getUser({ username }) {
  const client = createLdapClient();
  const { baseDn } = getSambaConfig();

  try {
    await ldapBindAsAdmin({ client });

    const users = await ldapSearch({
      client,
      baseDn,
      filter: `(sAMAccountName=${username})`,
      attributes: [
        'sAMAccountName',
        'displayName',
        'givenName',
        'sn',
        'mail',
        'description',
        'userAccountControl',
        'memberOf',
        'distinguishedName',
        'whenCreated',
        'lastLogonTimestamp',
      ],
    });

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    return {
      username: user.sAMAccountName,
      displayName: user.displayName || '',
      givenName: user.givenName || '',
      surname: user.sn || '',
      email: user.mail || '',
      description: user.description || '',
      enabled: !isAccountDisabled({ userAccountControl: user.userAccountControl }),
      memberOf: Array.isArray(user.memberOf) ? user.memberOf : user.memberOf ? [user.memberOf] : [],
      dn: user.dn,
      whenCreated: user.whenCreated || '',
      lastLogon: user.lastLogonTimestamp || '',
    };
  } finally {
    ldapDisconnect({ client });
  }
}

// Creates a new AD user
export async function createUser({ username, password, givenName, surname, mail }) {
  const args = ['user', 'create', username, password, '--use-username-as-cn'];

  if (givenName) args.push('--given-name', givenName);
  if (surname) args.push('--surname', surname);
  if (mail) args.push('--mail-address', mail);

  return runSambaTool({ args });
}

// Deletes an AD user
export async function deleteUser({ username }) {
  return runSambaTool({ args: ['user', 'delete', username] });
}

// Enables an AD user
export async function enableUser({ username }) {
  return runSambaTool({ args: ['user', 'enable', username] });
}

// Disables an AD user
export async function disableUser({ username }) {
  return runSambaTool({ args: ['user', 'disable', username] });
}

// Resets an AD user password
export async function resetPassword({ username, newPassword }) {
  return runSambaTool({
    args: ['user', 'setpassword', username, `--newpassword=${newPassword}`],
  });
}

// Checks if user account is disabled via userAccountControl flag
function isAccountDisabled({ userAccountControl }) {
  const uac = parseInt(userAccountControl, 10);
  // Bit 2 (0x0002) = ACCOUNTDISABLE
  return (uac & 0x0002) !== 0;
}
