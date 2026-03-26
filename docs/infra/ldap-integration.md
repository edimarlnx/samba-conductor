# LDAP Integration

This guide explains how to connect third-party applications to your Samba 4 Active Directory via LDAP/LDAPS.

## Connection Details

| Parameter       | Value                                                     |
|-----------------|-----------------------------------------------------------|
| **Protocol**    | LDAPS (recommended) or LDAP                               |
| **Host**        | Your DC hostname (e.g., `dc1.samdom.example.com`)         |
| **Port**        | 636 (LDAPS) or 389 (LDAP)                                 |
| **Base DN**     | `DC=samdom,DC=example,DC=com`                             |
| **Bind DN**     | `CN=svc-myapp,CN=Users,DC=samdom,DC=example,DC=com`       |
| **Bind Method** | Simple bind or UPN (e.g., `svc-myapp@SAMDOM.EXAMPLE.COM`) |

## Creating a Service Account for LDAP

Don't use the domain admin account for application LDAP binds. Create a dedicated service account:

1. Go to **Admin** > **Users** > **New User**
2. Create a user like `svc-myapp` with a strong password
3. Optionally, create a dedicated OU: **Admin** > **OUs** > **New OU** named `Service Accounts`
4. Move the user to that OU

## LDAP Search Filters

### Find a user by username

```
(sAMAccountName=john.doe)
```

### Find all users

```
(&(objectClass=user)(objectCategory=person))
```

### Find all enabled users

```
(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
```

### Find users in a specific group

```
(&(objectClass=user)(memberOf=CN=Developers,CN=Users,DC=samdom,DC=example,DC=com))
```

### Find all groups

```
(objectClass=group)
```

### Find all computers

```
(objectClass=computer)
```

### Find all OUs

```
(objectClass=organizationalUnit)
```

## Common User Attributes

| Attribute            | Description       | Example                       |
|----------------------|-------------------|-------------------------------|
| `sAMAccountName`     | Login name        | `john.doe`                    |
| `userPrincipalName`  | UPN               | `john.doe@samdom.example.com` |
| `displayName`        | Full name         | `John Doe`                    |
| `givenName`          | First name        | `John`                        |
| `sn`                 | Last name         | `Doe`                         |
| `mail`               | Email             | `john@example.com`            |
| `memberOf`           | Group memberships | DN list                       |
| `distinguishedName`  | Full DN           | `CN=john.doe,CN=Users,DC=...` |
| `userAccountControl` | Account flags     | `512` (enabled)               |

## Example: Python (ldap3)

```python
from ldap3 import Server, Connection, SUBTREE

server = Server('ldaps://dc1.samdom.example.com:636', use_ssl=True)
conn = Connection(server,
    user='svc-myapp@SAMDOM.EXAMPLE.COM',
    password='ServicePassword123!',
    auto_bind=True)

conn.search(
    search_base='DC=samdom,DC=example,DC=com',
    search_filter='(&(objectClass=user)(objectCategory=person))',
    search_scope=SUBTREE,
    attributes=['sAMAccountName', 'displayName', 'mail']
)

for entry in conn.entries:
    print(entry.sAMAccountName, entry.displayName, entry.mail)
```

## Example: Node.js (ldapjs)

```javascript
const ldap = require('ldapjs');

const client = ldap.createClient({
  url: 'ldaps://dc1.samdom.example.com:636',
  tlsOptions: { rejectUnauthorized: false } // for self-signed certs
});

client.bind('svc-myapp@SAMDOM.EXAMPLE.COM', 'ServicePassword123!', (err) => {
  if (err) { console.error('Bind failed:', err); return; }

  const opts = {
    filter: '(&(objectClass=user)(objectCategory=person))',
    scope: 'sub',
    attributes: ['sAMAccountName', 'displayName', 'mail']
  };

  client.search('DC=samdom,DC=example,DC=com', opts, (err, res) => {
    res.on('searchEntry', (entry) => {
      console.log(JSON.stringify(entry.pojo));
    });
    res.on('end', () => client.unbind());
  });
});
```

## Example: Apache/Nginx (HTTP Auth)

### Apache with mod_authnz_ldap

```apache
<Location /protected>
  AuthType Basic
  AuthName "Domain Login"
  AuthBasicProvider ldap
  AuthLDAPURL "ldaps://dc1.samdom.example.com:636/DC=samdom,DC=example,DC=com?sAMAccountName?sub?(objectClass=user)"
  AuthLDAPBindDN "svc-apache@SAMDOM.EXAMPLE.COM"
  AuthLDAPBindPassword "ServicePassword123!"
  Require valid-user
</Location>
```

### Nginx with nginx-auth-ldap

```nginx
ldap_server ad {
  url "ldaps://dc1.samdom.example.com:636/DC=samdom,DC=example,DC=com?sAMAccountName?sub?(objectClass=user)";
  binddn "svc-nginx@SAMDOM.EXAMPLE.COM";
  binddn_passwd "ServicePassword123!";
  group_attribute memberOf;
  group_attribute_is_dn on;
  require valid_user;
}

location /protected {
  auth_ldap "AD Login";
  auth_ldap_servers ad;
}
```

## TLS/SSL Notes

- The Samba Conductor Docker image generates a self-signed certificate by default
- For production, replace with a proper CA-signed certificate
- Certificate location: `/data/samba/private/tls/`
- If using self-signed certs, configure your LDAP client to skip verification (development only)
