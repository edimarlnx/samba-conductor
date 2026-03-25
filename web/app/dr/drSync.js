import { getSambaConfig } from '../samba/sambaConfig';
import { createLdapClient, ldapBindWithCredentials, ldapSearch, ldapDisconnect } from '../samba/sambaLdap';
import { runSambaTool, parseListOutput } from '../samba/sambaExec';
import { drEncrypt, isDrKeyUnlocked } from '../auth/drKeyStore';
import { AdSnapshotCollection } from './AdSnapshotCollection';

// Syncs all AD users metadata to MongoDB
export async function syncUsers({ credentials }) {
  const client = createLdapClient();
  const { baseDn } = getSambaConfig();

  try {
    await ldapBindWithCredentials({ client, credentials });

    const users = await ldapSearch({
      client,
      baseDn,
      filter: '(&(objectClass=user)(objectCategory=person))',
      attributes: [
        'sAMAccountName', 'displayName', 'givenName', 'sn', 'mail',
        'company', 'department', 'description', 'telephoneNumber',
        'physicalDeliveryOfficeName', 'userAccountControl', 'memberOf',
        'distinguishedName', 'whenCreated', 'lastLogonTimestamp',
      ],
    });

    await AdSnapshotCollection.upsertAsync(
      { type: 'users' },
      {
        $set: {
          type: 'users',
          snapshotAt: new Date(),
          data: users,
        },
      }
    );

    return { count: users.length };
  } finally {
    ldapDisconnect({ client });
  }
}

// Syncs all AD groups to MongoDB
export async function syncGroups({ credentials }) {
  const client = createLdapClient();
  const { baseDn } = getSambaConfig();

  try {
    await ldapBindWithCredentials({ client, credentials });

    const groups = await ldapSearch({
      client,
      baseDn,
      filter: '(objectClass=group)',
      attributes: [
        'sAMAccountName', 'description', 'member',
        'distinguishedName', 'groupType', 'whenCreated',
      ],
    });

    await AdSnapshotCollection.upsertAsync(
      { type: 'groups' },
      {
        $set: {
          type: 'groups',
          snapshotAt: new Date(),
          data: groups,
        },
      }
    );

    return { count: groups.length };
  } finally {
    ldapDisconnect({ client });
  }
}

// Syncs domain info to MongoDB
export async function syncDomain({ credentials }) {
  const { realm } = getSambaConfig();

  try {
    const { stdout: infoOutput } = await runSambaTool({
      args: ['domain', 'info', realm],
      credentials,
    });

    const { stdout: levelOutput } = await runSambaTool({
      args: ['domain', 'level', 'show'],
      credentials,
    }).catch(() => ({ stdout: '' }));

    await AdSnapshotCollection.upsertAsync(
      { type: 'domain' },
      {
        $set: {
          type: 'domain',
          snapshotAt: new Date(),
          data: [{ info: infoOutput, level: levelOutput }],
        },
      }
    );

    return { success: true };
  } catch (error) {
    console.error('[DR Sync] Domain sync failed:', error.message);
    return { error: error.message };
  }
}

// Syncs password hashes — encrypted with DR Key
// Requires DR Key to be unlocked and sync account to have replication permissions
export async function syncUserHashes({ credentials }) {
  if (!isDrKeyUnlocked()) {
    throw new Error('DR Key must be unlocked to sync password hashes');
  }

  // Get list of users first
  const { stdout } = await runSambaTool({
    args: ['user', 'list'],
    credentials,
  });
  const usernames = parseListOutput({ output: stdout });

  const hashes = [];

  for (const username of usernames) {
    try {
      const { stdout: hashOutput } = await runSambaTool({
        args: [
          'user', 'getpassword', username,
          '--attributes=unicodePwd,supplementalCredentials',
        ],
        credentials,
      });
      hashes.push({ username, hashData: hashOutput });
    } catch (error) {
      // Some system accounts may not have extractable hashes
      console.warn(`[DR Sync] Could not get hash for ${username}: ${error.message}`);
    }
  }

  // Encrypt all hashes with DR Key
  const sensitiveData = drEncrypt({ text: JSON.stringify(hashes) });

  await AdSnapshotCollection.upsertAsync(
    { type: 'hashes' },
    {
      $set: {
        type: 'hashes',
        snapshotAt: new Date(),
        sensitiveData,
        data: [{ count: hashes.length }],
      },
    }
  );

  return { count: hashes.length };
}

// Runs a full sync (metadata only — hashes are separate)
export async function runFullSync({ credentials }) {
  const results = {};

  results.users = await syncUsers({ credentials }).catch((e) => ({ error: e.message }));
  results.groups = await syncGroups({ credentials }).catch((e) => ({ error: e.message }));
  results.domain = await syncDomain({ credentials }).catch((e) => ({ error: e.message }));

  return results;
}
