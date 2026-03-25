import ldap from 'ldapjs';
import { Meteor } from 'meteor/meteor';
import { getSambaConfig } from './sambaConfig';

// Creates a new LDAP client connection
export function createLdapClient() {
  const { ldapUrl } = getSambaConfig();

  return ldap.createClient({
    url: ldapUrl,
    connectTimeout: 10000,
    timeout: 30000,
  });
}

// Binds to LDAP with given credentials
export function ldapBind({ client, dn, password }) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (error) => {
      if (error) {
        reject(
          new Meteor.Error('samba.ldap.bind.failed', `LDAP bind failed: ${error.message}`)
        );
      } else {
        resolve();
      }
    });
  });
}

// Searches LDAP with given parameters
export function ldapSearch({ client, baseDn, filter, scope = 'sub', attributes = [] }) {
  return new Promise((resolve, reject) => {
    const options = { filter, scope, attributes };

    client.search(baseDn, options, (error, res) => {
      if (error) {
        reject(
          new Meteor.Error('samba.ldap.search.failed', `LDAP search failed: ${error.message}`)
        );
        return;
      }

      const entries = [];

      res.on('searchEntry', (entry) => {
        const obj = {};
        entry.pojo.attributes.forEach((attr) => {
          obj[attr.type] = attr.values.length === 1 ? attr.values[0] : attr.values;
        });
        obj.dn = entry.pojo.objectName;
        entries.push(obj);
      });

      res.on('error', (err) => {
        reject(
          new Meteor.Error('samba.ldap.search.failed', `LDAP search error: ${err.message}`)
        );
      });

      res.on('end', () => {
        resolve(entries);
      });
    });
  });
}

// Disconnects an LDAP client
export function ldapDisconnect({ client }) {
  if (client) {
    client.unbind(() => {});
  }
}
