import {getSambaConfig} from './sambaConfig';
import {createLdapClient, ldapBindWithCredentials, ldapSearch, ldapDisconnect} from './sambaLdap';
import {runSambaTool} from './sambaExec';

// Lists all OUs with hierarchy built from DNs
export async function listOUs({credentials}) {
    const client = createLdapClient();
    const {baseDn} = getSambaConfig();

    try {
        await ldapBindWithCredentials({client, credentials});

        const ous = await ldapSearch({
            client,
            baseDn,
            filter: '(objectClass=organizationalUnit)',
            attributes: ['ou', 'description', 'distinguishedName', 'whenCreated'],
        });

        // Build tree from flat list of DNs
        return buildOUTree({ous, baseDn});
    } finally {
        ldapDisconnect({client});
    }
}

// Gets a single OU by DN
export async function getOU({ouDn, credentials}) {
    const client = createLdapClient();

    try {
        await ldapBindWithCredentials({client, credentials});

        const ous = await ldapSearch({
            client,
            baseDn: ouDn,
            filter: '(objectClass=organizationalUnit)',
            scope: 'base',
            attributes: ['ou', 'description', 'distinguishedName', 'whenCreated'],
        });

        return ous.length > 0 ? ous[0] : null;
    } finally {
        ldapDisconnect({client});
    }
}

// Lists objects inside an OU (one level deep)
export async function listOUObjects({ouDn, credentials}) {
    const client = createLdapClient();

    try {
        await ldapBindWithCredentials({client, credentials});

        const objects = await ldapSearch({
            client,
            baseDn: ouDn,
            filter: '(|(objectClass=user)(objectClass=group)(objectClass=computer)(objectClass=organizationalUnit))',
            scope: 'one',
            attributes: [
                'sAMAccountName', 'name', 'objectClass', 'description',
                'distinguishedName', 'userAccountControl',
            ],
        });

        return objects.map((obj) => {
            const objectClasses = Array.isArray(obj.objectClass) ? obj.objectClass : [obj.objectClass];
            let type = 'unknown';

            if (objectClasses.includes('organizationalUnit')) type = 'ou';
            else if (objectClasses.includes('computer')) type = 'computer';
            else if (objectClasses.includes('group')) type = 'group';
            else if (objectClasses.includes('user') || objectClasses.includes('person')) type = 'user';

            return {
                name: obj.name || obj.sAMAccountName || obj.ou || '',
                type,
                description: obj.description || '',
                dn: obj.dn,
            };
        });
    } finally {
        ldapDisconnect({client});
    }
}

// Creates a new OU
export async function createOU({name, description, parentOu, credentials}) {
    const {baseDn} = getSambaConfig();

    // Build the OU DN
    let ouDn = `OU=${name}`;
    if (parentOu) {
        ouDn = `OU=${name},${parentOu}`;
    }

    const args = ['ou', 'create', ouDn];
    if (description) args.push('--description', description);

    return runSambaTool({args, credentials});
}

// Deletes an OU
export async function deleteOU({ouDn, credentials}) {
    return runSambaTool({args: ['ou', 'delete', ouDn], credentials});
}

// Renames an OU
export async function renameOU({ouDn, newName, credentials}) {
    return runSambaTool({args: ['ou', 'rename', ouDn, newName], credentials});
}

// Moves an OU to a new parent
export async function moveOU({ouDn, newParentDn, credentials}) {
    return runSambaTool({args: ['ou', 'move', ouDn, newParentDn], credentials});
}

// Builds a tree structure from flat OU list based on DN hierarchy
function buildOUTree({ous, baseDn}) {
    const ouMap = new Map();

    // Create nodes
    ous.forEach((ou) => {
        ouMap.set(ou.dn, {
            name: ou.ou || extractOUName({dn: ou.dn}),
            description: ou.description || '',
            dn: ou.dn,
            whenCreated: ou.whenCreated || '',
            children: [],
        });
    });

    const roots = [];

    // Build parent-child relationships
    ouMap.forEach((node) => {
        const parentDn = getParentDn({dn: node.dn});

        if (ouMap.has(parentDn)) {
            ouMap.get(parentDn).children.push(node);
        } else {
            // Parent is the domain root or a non-OU container
            roots.push(node);
        }
    });

    return roots;
}

// Extracts OU name from DN (e.g., "OU=Sales,DC=..." → "Sales")
function extractOUName({dn}) {
    const match = dn.match(/^OU=([^,]+)/i);
    return match ? match[1] : dn;
}

// Gets parent DN by removing the first component
function getParentDn({dn}) {
    const commaIndex = dn.indexOf(',');
    return commaIndex > 0 ? dn.substring(commaIndex + 1) : '';
}
