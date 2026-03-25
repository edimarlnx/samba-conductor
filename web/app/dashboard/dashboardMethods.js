import { Meteor } from 'meteor/meteor';
import { getDomainInfo } from '../samba/sambaDomain';
import { listUsers } from '../samba/sambaUsers';
import { listGroups } from '../samba/sambaGroups';

Meteor.methods({
  'dashboard.getSummary': async function getDashboardSummary() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    try {
      const [domainInfo, users, groups] = await Promise.all([
        getDomainInfo(),
        listUsers().catch(() => []),
        listGroups().catch(() => []),
      ]);

      return {
        domain: domainInfo,
        usersCount: users.length,
        groupsCount: groups.length,
        enabledUsersCount: users.filter((u) => u.enabled).length,
        disabledUsersCount: users.filter((u) => !u.enabled).length,
      };
    } catch (error) {
      console.error('[Dashboard] Failed to get summary:', error);

      // Return fallback data when samba is not available
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
