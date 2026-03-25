import { Meteor } from 'meteor/meteor';
import { getReadCredentials } from '../auth/credentialStore';
import { getDomainInfo, getDomainLevel } from '../samba/sambaDomain';

Meteor.methods({
  // READ — fallback to sync account
  'domain.getInfo': async function getDomainFullInfo() {
    const credentials = await getReadCredentials({ userId: this.userId });

    const [info, levels] = await Promise.all([
      getDomainInfo({ credentials }).catch((e) => ({ error: e.message })),
      getDomainLevel({ credentials }).catch((e) => ({ error: e.message })),
    ]);

    return {
      ...info,
      levels,
    };
  },
});
