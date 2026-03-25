import { getSambaConfig } from './sambaConfig';
import { createLdapClient, ldapBindWithCredentials, ldapSearch, ldapDisconnect } from './sambaLdap';
import { runSambaTool, parseListOutput } from './sambaExec';

// Lists all AD groups with attributes
export async function listGroups({ credentials }) {
  const client = createLdapClient();
  const { baseDn } = getSambaConfig();

  try {
    await ldapBindWithCredentials({ client, credentials });

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
export async function getGroup({ groupName, credentials }) {
  const client = createLdapClient();
  const { baseDn } = getSambaConfig();

  try {
    await ldapBindWithCredentials({ client, credentials });

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
export async function createGroup({ groupName, description, credentials }) {
  const args = ['group', 'add', groupName];
  if (description) args.push('--description', description);
  return runSambaTool({ args, credentials });
}

// Deletes an AD group
export async function deleteGroup({ groupName, credentials }) {
  return runSambaTool({ args: ['group', 'delete', groupName], credentials });
}

// Adds a member to an AD group
export async function addGroupMember({ groupName, memberName, credentials }) {
  return runSambaTool({ args: ['group', 'addmembers', groupName, memberName], credentials });
}

// Removes a member from an AD group
export async function removeGroupMember({ groupName, memberName, credentials }) {
  return runSambaTool({ args: ['group', 'removemembers', groupName, memberName], credentials });
}

// Lists members of an AD group
export async function listGroupMembers({ groupName, credentials }) {
  const { stdout } = await runSambaTool({ args: ['group', 'listmembers', groupName], credentials });
  return parseListOutput({ output: stdout });
}
