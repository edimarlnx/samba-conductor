import {getSambaConfig} from './sambaConfig';
import {createLdapClient, ldapBindWithCredentials, ldapSearch, ldapDisconnect} from './sambaLdap';
import {runSambaTool, parseListOutput} from './sambaExec';

// Lists all managed service accounts
export async function listServiceAccounts({credentials}) {
    const client = createLdapClient();
    const {baseDn} = getSambaConfig();

    try {
        await ldapBindWithCredentials({client, credentials});

        const accounts = await ldapSearch({
            client,
            baseDn,
            filter: '(objectClass=msDS-GroupManagedServiceAccount)',
            attributes: [
                'sAMAccountName', 'name', 'description', 'dNSHostName',
                'msDS-ManagedPasswordInterval', 'msDS-GroupMSAMembership',
                'whenCreated', 'distinguishedName', 'userAccountControl',
            ],
        });

        return accounts.map((a) => ({
            name: a.name || '',
            sAMAccountName: a.sAMAccountName || '',
            description: a.description || '',
            dnsHostName: a.dNSHostName || '',
            passwordInterval: a['msDS-ManagedPasswordInterval'] || '',
            whenCreated: a.whenCreated || '',
            enabled: !isAccountDisabled({userAccountControl: a.userAccountControl}),
            dn: a.dn,
        }));
    } finally {
        ldapDisconnect({client});
    }
}

// Gets details of a service account
export async function getServiceAccount({accountName, credentials}) {
    const {stdout} = await runSambaTool({
        args: ['service-account', 'view', '--name', accountName],
        credentials,
    });
    return parseServiceAccountView({output: stdout});
}

// Creates a new gMSA
export async function createServiceAccount({name, dnsHostName, passwordInterval, credentials}) {
    const args = ['service-account', 'create', '--name', name, '--dns-host-name', dnsHostName];
    if (passwordInterval) args.push('--managed-password-interval', String(passwordInterval));
    return runSambaTool({args, credentials});
}

// Deletes a service account
export async function deleteServiceAccount({name, credentials}) {
    return runSambaTool({args: ['service-account', 'delete', '--name', name], credentials});
}

// Modifies a service account
export async function modifyServiceAccount({name, dnsHostName, passwordInterval, credentials}) {
    const args = ['service-account', 'modify', '--name', name];
    if (dnsHostName) args.push('--dns-host-name', dnsHostName);
    if (passwordInterval) args.push('--managed-password-interval', String(passwordInterval));
    return runSambaTool({args, credentials});
}

// Parses samba-tool service-account view output
function parseServiceAccountView({output}) {
    const info = {};
    output.split('\n').forEach((line) => {
        const match = line.match(/^(\S[^:]+):\s*(.+)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            info[key] = value;
        }
    });
    return info;
}

function isAccountDisabled({userAccountControl}) {
    const uac = parseInt(userAccountControl, 10);
    return (uac & 0x0002) !== 0;
}
