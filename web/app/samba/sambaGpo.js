import {runSambaTool} from './sambaExec';

// Lists all GPOs in the domain
export async function listAllGPOs({credentials}) {
    const {stdout} = await runSambaTool({
        args: ['gpo', 'listall'],
        credentials,
    });
    return parseGPOList({output: stdout});
}

// Lists GPOs linked to a specific container (OU DN)
export async function getGPOLinks({containerDn, credentials}) {
    const {stdout} = await runSambaTool({
        args: ['gpo', 'getlink', containerDn],
        credentials,
    });
    return parseGPOList({output: stdout});
}

// Gets inheritance flag for a container
export async function getGPOInheritance({containerDn, credentials}) {
    const {stdout} = await runSambaTool({
        args: ['gpo', 'getinheritance', containerDn],
        credentials,
    });
    return stdout;
}

// Creates a new empty GPO
export async function createGPO({displayName, credentials}) {
    return runSambaTool({
        args: ['gpo', 'create', displayName],
        credentials,
    });
}

// Deletes a GPO
export async function deleteGPO({gpoId, credentials}) {
    return runSambaTool({
        args: ['gpo', 'del', gpoId],
        credentials,
    });
}

// Links a GPO to a container (OU)
export async function linkGPO({containerDn, gpoId, credentials}) {
    return runSambaTool({
        args: ['gpo', 'setlink', containerDn, gpoId],
        credentials,
    });
}

// Removes a GPO link from a container
export async function unlinkGPO({containerDn, gpoId, credentials}) {
    return runSambaTool({
        args: ['gpo', 'dellink', containerDn, gpoId],
        credentials,
    });
}

// Parses GPO list output from samba-tool
function parseGPOList({output}) {
    const gpos = [];
    let current = null;

    output.split('\n').forEach((line) => {
        const gpoMatch = line.match(/GPO\s*:\s*(.+)/);
        const nameMatch = line.match(/display name\s*:\s*(.+)/);
        const pathMatch = line.match(/path\s*:\s*(.+)/);
        const dnMatch = line.match(/dn\s*:\s*(.+)/);
        const versionMatch = line.match(/version\s*:\s*(.+)/);
        const flagsMatch = line.match(/flags\s*:\s*(.+)/);

        if (gpoMatch) {
            current = {id: gpoMatch[1].trim()};
            gpos.push(current);
        }
        if (current && nameMatch) current.displayName = nameMatch[1].trim();
        if (current && pathMatch) current.path = pathMatch[1].trim();
        if (current && dnMatch) current.dn = dnMatch[1].trim();
        if (current && versionMatch) current.version = versionMatch[1].trim();
        if (current && flagsMatch) current.flags = flagsMatch[1].trim();
    });

    return gpos;
}
