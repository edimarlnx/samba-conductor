import { Meteor } from 'meteor/meteor';
import { getDomainInfo, getDomainLevel } from '../samba/sambaDomain';

Meteor.methods({
  'domain.getInfo': async function getDomainFullInfo() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const [info, levels] = await Promise.all([
      getDomainInfo().catch((e) => ({ error: e.message })),
      getDomainLevel().catch((e) => ({ error: e.message })),
    ]);

    return {
      ...info,
      levels,
    };
  },
});
