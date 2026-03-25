import { getSambaConfig } from './sambaConfig';
import { createLdapClient, ldapBind, ldapSearch, ldapDisconnect } from './sambaLdap';
import { runSambaTool, parseListOutput } from './sambaExec';

// Lists all AD groups with attributes
export async function listGroups() {
  const client = createLdapClient();
  const { baseDn, realm } = getSambaConfig();

  try {
    await ldapBindAsAdmin({ client, baseDn, realm });

    const groups = await ldapSearch({
      client,
      baseDn,
      filter: '(objectClass=group)',
      attributes: [
        'sAMAccountName',
        'description',
        'member',
        'distinguishedName',
        'groupType',
        'whenCreated',
      ],
    });

    return groups.map((group) => {
      const members = Array.isArray(group.member)
        ? group.member
        : group.member
          ? [group.member]
          : [];

      return {
        name: group.sAMAccountName,
        description: group.description || '',
        memberCount: members.length,
        dn: group.dn,
        groupType: group.groupType || '',
        whenCreated: group.whenCreated || '',
      };
    });
  } finally {
    ldapDisconnect({ client });
  }
}

// Gets a single AD group with its members
export async function getGroup({ groupName }) {
  const client = createLdapClient();
  const { baseDn, realm } = getSambaConfig();

  try {
    await ldapBindAsAdmin({ client, baseDn, realm });

    const groups = await ldapSearch({
      client,
      baseDn,
      filter: `(sAMAccountName=${groupName})`,
      attributes: [
        'sAMAccountName',
        'description',
        'member',
        'distinguishedName',
        'groupType',
        'whenCreated',
      ],
    });

    if (groups.length === 0) {
      return null;
    }

    const group = groups[0];
    const members = Array.isArray(group.member)
      ? group.member
      : group.member
        ? [group.member]
        : [];

    return {
      name: group.sAMAccountName,
      description: group.description || '',
      members,
      memberCount: members.length,
      dn: group.dn,
      groupType: group.groupType || '',
      whenCreated: group.whenCreated || '',
    };
  } finally {
    ldapDisconnect({ client });
  }
}

// Creates a new AD group
export async function createGroup({ groupName, description }) {
  const args = ['group', 'add', groupName];

  if (description) args.push('--description', description);

  return runSambaTool({ args });
}

// Deletes an AD group
export async function deleteGroup({ groupName }) {
  return runSambaTool({ args: ['group', 'delete', groupName] });
}

// Adds a member to an AD group
export async function addGroupMember({ groupName, memberName }) {
  return runSambaTool({ args: ['group', 'addmembers', groupName, memberName] });
}

// Removes a member from an AD group
export async function removeGroupMember({ groupName, memberName }) {
  return runSambaTool({ args: ['group', 'removemembers', groupName, memberName] });
}

// Lists members of an AD group
export async function listGroupMembers({ groupName }) {
  const { stdout } = await runSambaTool({ args: ['group', 'listmembers', groupName] });
  return parseListOutput({ output: stdout });
}

// Binds to LDAP as admin
async function ldapBindAsAdmin({ client, baseDn, realm }) {
  const settings = require('meteor/meteor').Meteor.settings?.samba;
  const adminPassword = settings?.adminPassword || process.env.SAMBA_ADMIN_PASSWORD;

  if (!adminPassword) {
    return;
  }

  await ldapBind({ client, dn: `Administrator@${realm}`, password: adminPassword });
}
