import { Meteor } from 'meteor/meteor';

// Returns Samba connection configuration from Meteor settings
export function getSambaConfig() {
  const settings = Meteor.settings?.samba;

  if (!settings) {
    throw new Meteor.Error(
      'samba.config.missing',
      'Samba configuration not found in Meteor settings'
    );
  }

  return {
    ldapUrl: settings.ldapUrl,
    baseDn: settings.baseDn,
    realm: settings.realm,
    tlsRejectUnauthorized: settings.tlsRejectUnauthorized !== false,
    dockerContainer: settings.dockerContainer || null,
    sessionTtlMinutes: settings.sessionTtlMinutes || 30,
  };
}
