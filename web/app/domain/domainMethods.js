import { Meteor } from 'meteor/meteor';
import { getCredentials } from '../auth/credentialStore';
import { getDomainInfo, getDomainLevel } from '../samba/sambaDomain';

Meteor.methods({
  'domain.getInfo': async function getDomainFullInfo() {
    const credentials = getCredentials({ userId: this.userId });

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
