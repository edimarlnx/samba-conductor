import { getSambaConfig } from './sambaConfig';
import { createLdapClient, ldapBindWithCredentials, ldapSearch, ldapDisconnect } from './sambaLdap';
import { runSambaTool } from './sambaExec';

// Lists all AD users with their attributes
export async function listUsers({ credentials }) {
  const client = createLdapClient();
  const { baseDn } = getSambaConfig();

  try {
    await ldapBindWithCredentials({ client, credentials });

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
export async function getUser({ username, credentials }) {
  const client = createLdapClient();
  const { baseDn } = getSambaConfig();

  try {
    await ldapBindWithCredentials({ client, credentials });

    const users = await ldapSearch({
      client,
      baseDn,
      filter: `(sAMAccountName=${username})`,
      attributes: [
        'sAMAccountName',
        'displayName',
        'givenName',
        'sn',
        'initials',
        'mail',
        'company',
        'department',
        'description',
        'telephoneNumber',
        'physicalDeliveryOfficeName',
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
      initials: user.initials || '',
      company: user.company || '',
      department: user.department || '',
      description: user.description || '',
      telephoneNumber: user.telephoneNumber || '',
      physicalDeliveryOffice: user.physicalDeliveryOfficeName || '',
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

// Creates a new AD user with all supported attributes
export async function createUser({
  username, password, givenName, surname, initials, mail,
  company, department, description, telephoneNumber,
  physicalDeliveryOffice, userou, mustChangeAtNextLogin,
  unixHome, loginShell, uidNumber, gidNumber, credentials,
}) {
  const args = ['user', 'create', username, password, '--use-username-as-cn'];

  const optionalArgs = [
    ['--given-name', givenName],
    ['--surname', surname],
    ['--initials', initials],
    ['--mail-address', mail],
    ['--company', company],
    ['--department', department],
    ['--description', description],
    ['--telephone-number', telephoneNumber],
    ['--physical-delivery-office', physicalDeliveryOffice],
    ['--userou', userou],
    ['--unix-home', unixHome],
    ['--login-shell', loginShell],
    ['--uid-number', uidNumber],
    ['--gid-number', gidNumber],
  ];

  optionalArgs.forEach(([flag, value]) => {
    if (value) args.push(flag, String(value));
  });

  if (mustChangeAtNextLogin) {
    args.push('--must-change-at-next-login');
  }

  return runSambaTool({ args, credentials });
}

// Deletes an AD user
export async function deleteUser({ username, credentials }) {
  return runSambaTool({ args: ['user', 'delete', username], credentials });
}

// Moves a user to a different OU
export async function moveUser({username, newOuDn, credentials}) {
    return runSambaTool({args: ['user', 'move', username, newOuDn], credentials});
}

// Enables an AD user
export async function enableUser({ username, credentials }) {
  return runSambaTool({ args: ['user', 'enable', username], credentials });
}

// Disables an AD user
export async function disableUser({ username, credentials }) {
  return runSambaTool({ args: ['user', 'disable', username], credentials });
}

// Resets an AD user password
export async function resetPassword({ username, newPassword, credentials }) {
  return runSambaTool({
    args: ['user', 'setpassword', username, `--newpassword=${newPassword}`],
    credentials,
  });
}

// Updates specific AD user attributes via samba-tool
export async function updateUserAttributes({ username, attributes, credentials }) {
  const results = [];

  for (const [attr, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) {
      const result = await runSambaTool({
        args: ['user', 'setattr', username, attr, String(value)],
        credentials,
      });
      results.push(result);
    }
  }

  return results;
}

// Checks if user account is disabled via userAccountControl flag
function isAccountDisabled({ userAccountControl }) {
  const uac = parseInt(userAccountControl, 10);
  return (uac & 0x0002) !== 0;
}
