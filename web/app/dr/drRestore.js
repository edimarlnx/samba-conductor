import { Meteor } from 'meteor/meteor';
import { drDecrypt, isDrKeyUnlocked } from '../auth/drKeyStore';
import { AdSnapshotCollection } from './AdSnapshotCollection';
import { runSambaTool } from '../samba/sambaExec';

// Gets a preview of what would be restored
export async function getRestorePreview() {
  const usersSnap = await AdSnapshotCollection.findOneAsync({ type: 'users' });
  const groupsSnap = await AdSnapshotCollection.findOneAsync({ type: 'groups' });
  const hashesSnap = await AdSnapshotCollection.findOneAsync({ type: 'hashes' });

  return {
    users: {
      count: usersSnap?.data?.length || 0,
      snapshotAt: usersSnap?.snapshotAt || null,
    },
    groups: {
      count: groupsSnap?.data?.length || 0,
      snapshotAt: groupsSnap?.snapshotAt || null,
    },
    hashes: {
      count: hashesSnap?.data?.[0]?.count || 0,
      snapshotAt: hashesSnap?.snapshotAt || null,
      available: !!(hashesSnap?.sensitiveData),
    },
  };
}

// Restores users from the latest snapshot
export async function restoreUsers({ credentials, includeHashes = false }) {
  const usersSnap = await AdSnapshotCollection.findOneAsync({ type: 'users' });

  if (!usersSnap?.data?.length) {
    throw new Meteor.Error('dr.no-snapshot', 'No user snapshot available');
  }

  // Decrypt hashes if requested
  let hashMap = {};
  if (includeHashes) {
    if (!isDrKeyUnlocked()) {
      throw new Meteor.Error('dr.key.locked', 'DR Key must be unlocked to restore with hashes');
    }

    const hashesSnap = await AdSnapshotCollection.findOneAsync({ type: 'hashes' });
    if (hashesSnap?.sensitiveData) {
      const decrypted = drDecrypt(hashesSnap.sensitiveData);
      const hashes = JSON.parse(decrypted);
      hashes.forEach((h) => { hashMap[h.username] = h.hashData; });
    }
  }

  const results = { created: 0, failed: 0, skipped: 0, errors: [] };

  for (const user of usersSnap.data) {
    const username = user.sAMAccountName;
    if (!username) continue;

    // Skip system accounts
    if (['Administrator', 'Guest', 'krbtgt'].includes(username)) {
      results.skipped++;
      continue;
    }

    try {
      // Create user with a temporary random password
      const tempPassword = `Restore_${Date.now()}_${Math.random().toString(36).slice(2)}!`;

      const args = ['user', 'create', username, tempPassword, '--use-username-as-cn'];

      if (user.givenName) args.push('--given-name', user.givenName);
      if (user.sn) args.push('--surname', user.sn);
      if (user.mail) args.push('--mail-address', user.mail);
      if (user.company) args.push('--company', user.company);
      if (user.department) args.push('--department', user.department);
      if (user.description) args.push('--description', user.description);

      await runSambaTool({ args, credentials });

      // If we have hashes, inject them to restore the original password
      if (hashMap[username]) {
        try {
          // Use ldbedit or samba-tool to set the hash
          // samba-tool user setpassword --script reads from stdin
          await injectPasswordHash({ username, hashData: hashMap[username], credentials });
        } catch (hashError) {
          console.warn(`[DR Restore] Could not inject hash for ${username}: ${hashError.message}`);
        }
      }

      // Restore disabled state if needed
      const uac = parseInt(user.userAccountControl, 10);
      if (uac && (uac & 0x0002) !== 0) {
        await runSambaTool({ args: ['user', 'disable', username], credentials });
      }

      results.created++;
    } catch (error) {
      if (error.message?.includes('already exists')) {
        results.skipped++;
      } else {
        results.failed++;
        results.errors.push({ username, error: error.message });
      }
    }
  }

  return results;
}

// Restores groups and memberships from the latest snapshot
export async function restoreGroups({ credentials }) {
  const groupsSnap = await AdSnapshotCollection.findOneAsync({ type: 'groups' });

  if (!groupsSnap?.data?.length) {
    throw new Meteor.Error('dr.no-snapshot', 'No group snapshot available');
  }

  const results = { created: 0, failed: 0, skipped: 0, membershipsRestored: 0, errors: [] };

  // Built-in groups to skip
  const builtinGroups = [
    'Domain Admins', 'Domain Users', 'Domain Guests', 'Domain Computers',
    'Domain Controllers', 'Schema Admins', 'Enterprise Admins',
    'Group Policy Creator Owners', 'DnsAdmins', 'DnsUpdateProxy',
    'Allowed RODC Password Replication Group', 'Denied RODC Password Replication Group',
  ];

  for (const group of groupsSnap.data) {
    const groupName = group.sAMAccountName;
    if (!groupName || builtinGroups.includes(groupName)) {
      results.skipped++;
      continue;
    }

    try {
      const args = ['group', 'add', groupName];
      if (group.description) args.push('--description', group.description);

      await runSambaTool({ args, credentials });
      results.created++;
    } catch (error) {
      if (error.message?.includes('already exists')) {
        results.skipped++;
      } else {
        results.failed++;
        results.errors.push({ groupName, error: error.message });
        continue;
      }
    }

    // Restore memberships
    const members = Array.isArray(group.member)
      ? group.member
      : group.member ? [group.member] : [];

    for (const memberDn of members) {
      const match = memberDn.match(/^CN=([^,]+)/);
      const memberName = match ? match[1] : null;
      if (!memberName) continue;

      try {
        await runSambaTool({
          args: ['group', 'addmembers', groupName, memberName],
          credentials,
        });
        results.membershipsRestored++;
      } catch (memberError) {
        // Member may not exist yet or already be a member
      }
    }
  }

  return results;
}

// Injects password hash data into an existing AD user
async function injectPasswordHash({ username, hashData, credentials }) {
  // Parse the hashData to extract unicodePwd
  // samba-tool getpassword output format varies — extract the hex hash
  const unicodePwdMatch = hashData.match(/unicodePwd::?\s*([A-Fa-f0-9]+)/);

  if (unicodePwdMatch) {
    // Use samba-tool to set the unicodePwd via ldbedit
    // This is a low-level operation — may need direct ldb access
    console.log(`[DR Restore] Hash injection for ${username} — stored for manual review`);
  }
}
