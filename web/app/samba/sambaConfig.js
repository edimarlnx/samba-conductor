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
    // When false, accepts self-signed certificates (development)
    // In production with proper CA certs, set to true or omit
    tlsRejectUnauthorized: settings.tlsRejectUnauthorized !== false,
    // When set, samba-tool runs via "docker exec <container>" instead of locally
    // Set to null/omit in production when the app runs inside the same container
    dockerContainer: settings.dockerContainer || null,
    // Admin password for LDAP bind (server-side searches)
    // In production, prefer env var SAMBA_ADMIN_PASSWORD over settings
    adminPassword: settings.adminPassword || process.env.SAMBA_ADMIN_PASSWORD || null,
  };
}
