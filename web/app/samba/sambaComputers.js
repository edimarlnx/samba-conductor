import {getSambaConfig} from './sambaConfig';
import {createLdapClient, ldapBindWithCredentials, ldapSearch, ldapDisconnect} from './sambaLdap';
import {runSambaTool} from './sambaExec';

// Lists all computer accounts with attributes
export async function listComputers({credentials}) {
    const client = createLdapClient();
    const {baseDn} = getSambaConfig();

    try {
        await ldapBindWithCredentials({client, credentials});

        const computers = await ldapSearch({
            client,
            baseDn,
            filter: '(objectClass=computer)',
            attributes: [
                'sAMAccountName', 'name', 'description', 'operatingSystem',
                'operatingSystemVersion', 'dNSHostName', 'userAccountControl',
                'whenCreated', 'lastLogonTimestamp', 'distinguishedName',
            ],
        });

        return computers.map((c) => ({
            name: c.name || '',
            sAMAccountName: c.sAMAccountName || '',
            description: c.description || '',
            os: c.operatingSystem || '',
            osVersion: c.operatingSystemVersion || '',
            dnsHostName: c.dNSHostName || '',
            enabled: !isAccountDisabled({userAccountControl: c.userAccountControl}),
            whenCreated: c.whenCreated || '',
            lastLogon: c.lastLogonTimestamp || '',
            dn: c.dn,
        }));
    } finally {
        ldapDisconnect({client});
    }
}

// Gets a single computer by name
export async function getComputer({computerName, credentials}) {
    const client = createLdapClient();
    const {baseDn} = getSambaConfig();

    try {
        await ldapBindWithCredentials({client, credentials});

        const computers = await ldapSearch({
            client,
            baseDn,
            filter: `(sAMAccountName=${computerName}$)`,
            attributes: [
                'sAMAccountName', 'name', 'description', 'operatingSystem',
                'operatingSystemVersion', 'operatingSystemServicePack',
                'dNSHostName', 'userAccountControl', 'memberOf',
                'whenCreated', 'lastLogonTimestamp', 'distinguishedName',
                'managedBy',
            ],
        });

        if (computers.length === 0) return null;

        const c = computers[0];
        return {
            name: c.name || '',
            sAMAccountName: c.sAMAccountName || '',
            description: c.description || '',
            os: c.operatingSystem || '',
            osVersion: c.operatingSystemVersion || '',
            osServicePack: c.operatingSystemServicePack || '',
            dnsHostName: c.dNSHostName || '',
            enabled: !isAccountDisabled({userAccountControl: c.userAccountControl}),
            memberOf: Array.isArray(c.memberOf) ? c.memberOf : c.memberOf ? [c.memberOf] : [],
            managedBy: c.managedBy || '',
            whenCreated: c.whenCreated || '',
            lastLogon: c.lastLogonTimestamp || '',
            dn: c.dn,
        };
    } finally {
        ldapDisconnect({client});
    }
}

// Creates a new computer account
export async function createComputer({computerName, description, computerOu, credentials}) {
    const args = ['computer', 'create', computerName];
    if (description) args.push('--description', description);
    if (computerOu) args.push('--computerou', computerOu);
    return runSambaTool({args, credentials});
}

// Deletes a computer account
export async function deleteComputer({computerName, credentials}) {
    return runSambaTool({args: ['computer', 'delete', computerName], credentials});
}

// Moves a computer to a different OU
export async function moveComputer({computerName, newOuDn, credentials}) {
    return runSambaTool({args: ['computer', 'move', computerName, newOuDn], credentials});
}

function isAccountDisabled({userAccountControl}) {
    const uac = parseInt(userAccountControl, 10);
    return (uac & 0x0002) !== 0;
}
