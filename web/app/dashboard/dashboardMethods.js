import { Meteor } from 'meteor/meteor';
import { getReadCredentials } from '../auth/credentialStore';
import { getDomainInfo } from '../samba/sambaDomain';
import { listUsers } from '../samba/sambaUsers';
import { listGroups } from '../samba/sambaGroups';

Meteor.methods({
  'dashboard.getSummary': async function getDashboardSummary() {
    const credentials = await getReadCredentials({ userId: this.userId });

    try {
      const [domainInfo, users, groups] = await Promise.all([
        getDomainInfo({ credentials }),
        listUsers({ credentials }).catch(() => []),
        listGroups({ credentials }).catch(() => []),
      ]);

      return {
        domain: domainInfo,
        usersCount: users.length,
        groupsCount: groups.length,
        enabledUsersCount: users.filter((u) => u.enabled).length,
        disabledUsersCount: users.filter((u) => !u.enabled).length,
      };
    } catch (error) {
      if (error.error === 'session-expired') throw error;

      console.error('[Dashboard] Failed to get summary:', error);
      return {
        domain: { realm: 'Not connected', baseDn: '', error: error.message },
        usersCount: 0,
        groupsCount: 0,
        enabledUsersCount: 0,
        disabledUsersCount: 0,
      };
    }
  },
});
