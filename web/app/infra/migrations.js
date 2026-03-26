import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/quave:migrations';
import { SettingsCollection } from '../settings/SettingsCollection';
import { SETTINGS_DEFAULTS } from '../settings/settingsDefaults';

Migrations.config({
  log: true,
});

Migrations.add({
  version: 1,
  name: 'Not really migrating anything',
  up() {
    // eslint-disable-next-line no-console
    console.log("I'm a fake migration");
  },
});

Migrations.add({
  version: 2,
  name: 'Insert default self-service settings',
  async up() {
    for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
      const existing = await SettingsCollection.findOneAsync({ key });
      if (!existing) {
        await SettingsCollection.insertAsync({ key, value });
        // eslint-disable-next-line no-console
        console.log(`[Migration] Inserted default setting: ${key}`);
      }
    }
  },
});

Migrations.add({
  version: 3,
  name: 'Create indexes for adSnapshots collection',
  async up() {
    const { AdSnapshotCollection } = require('../dr/AdSnapshotCollection');
    const rawCollection = AdSnapshotCollection.rawCollection();
    await rawCollection.createIndex({ type: 1 }, { unique: true });
    // eslint-disable-next-line no-console
    console.log('[Migration] Created adSnapshots index on type');
  },
});

Migrations.add({
    version: 4,
    name: 'Create default OAuth realm',
    async up() {
        const {OAuthRealmsCollection} = require('../oauth/OAuthRealmsCollection');
        const existing = await OAuthRealmsCollection.findOneAsync({name: 'default'});
        if (!existing) {
            await OAuthRealmsCollection.insertAsync({
                name: 'default',
                displayName: 'Default',
                description: 'Default realm for all OAuth clients',
                allowedScopes: ['openid', 'profile', 'email', 'groups', 'phone'],
                defaultScopes: ['openid', 'profile'],
                enabled: true,
                createdAt: new Date(),
            });
            // eslint-disable-next-line no-console
            console.log('[Migration] Created default OAuth realm');
        }
    },
});

Meteor.startup(() => {
  Migrations.migrateTo('latest');
});
