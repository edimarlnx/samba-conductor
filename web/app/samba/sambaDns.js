import {getSambaConfig} from './sambaConfig';
import {runSambaTool} from './sambaExec';

// Gets the DC hostname for DNS queries
function getDcHostname() {
    const {realm} = getSambaConfig();
    return `dc1.${realm.toLowerCase()}`;
}

// Lists all DNS zones
export async function listZones({credentials}) {
    const dc = getDcHostname();
    const {stdout} = await runSambaTool({
        args: ['dns', 'zonelist', dc],
        credentials,
    });
    return parseZoneList({output: stdout});
}

// Gets zone info
export async function getZoneInfo({zoneName, credentials}) {
    const dc = getDcHostname();
    const {stdout} = await runSambaTool({
        args: ['dns', 'zoneinfo', dc, zoneName],
        credentials,
    });
    return parseKeyValue({output: stdout});
}

// Lists DNS records in a zone
export async function listRecords({zoneName, name = '@', credentials}) {
    const dc = getDcHostname();
    const {stdout} = await runSambaTool({
        args: ['dns', 'query', dc, zoneName, name, 'ALL'],
        credentials,
    });
    return parseRecords({output: stdout});
}

// Adds a DNS record
export async function addRecord({zoneName, name, recordType, data, credentials}) {
    const dc = getDcHostname();
    return runSambaTool({
        args: ['dns', 'add', dc, zoneName, name, recordType, data],
        credentials,
    });
}

// Deletes a DNS record
export async function deleteRecord({zoneName, name, recordType, data, credentials}) {
    const dc = getDcHostname();
    return runSambaTool({
        args: ['dns', 'delete', dc, zoneName, name, recordType, data],
        credentials,
    });
}

// Updates a DNS record
export async function updateRecord({zoneName, name, recordType, oldData, newData, credentials}) {
    const dc = getDcHostname();
    return runSambaTool({
        args: ['dns', 'update', dc, zoneName, name, recordType, oldData, newData],
        credentials,
    });
}

// Creates a new DNS zone
export async function createZone({zoneName, credentials}) {
    const dc = getDcHostname();
    return runSambaTool({
        args: ['dns', 'zonecreate', dc, zoneName],
        credentials,
    });
}

// Deletes a DNS zone
export async function deleteZone({zoneName, credentials}) {
    const dc = getDcHostname();
    return runSambaTool({
        args: ['dns', 'zonedelete', dc, zoneName],
        credentials,
    });
}

// Parses zone list output
function parseZoneList({output}) {
    const zones = [];
    let current = null;

    output.split('\n').forEach((line) => {
        const nameMatch = line.match(/pszZoneName\s*:\s*(.+)/);
        const typeMatch = line.match(/ZoneType\s*:\s*(.+)/);
        const flagsMatch = line.match(/Flags\s*:\s*(.+)/);

        if (nameMatch) {
            current = {name: nameMatch[1].trim(), type: '', flags: ''};
            zones.push(current);
        }
        if (current && typeMatch) current.type = typeMatch[1].trim();
        if (current && flagsMatch) current.flags = flagsMatch[1].trim();
    });

    return zones;
}

// Parses DNS records output
function parseRecords({output}) {
    const records = [];
    let currentName = '';

    output.split('\n').forEach((line) => {
        const nameMatch = line.match(/^\s*Name=(\S*),\s*Records=(\d+)/);
        if (nameMatch) {
            currentName = nameMatch[1] || '@';
            return;
        }

        const recordMatch = line.match(/^\s+(\w+):\s*(.+)\s*\(flags=\S+,\s*serial=(\d+),\s*ttl=(\d+)\)/);
        if (recordMatch) {
            records.push({
                name: currentName,
                type: recordMatch[1],
                data: recordMatch[2].trim(),
                serial: recordMatch[3],
                ttl: recordMatch[4],
            });
        }
    });

    return records;
}

// Parses key-value output
function parseKeyValue({output}) {
    const info = {};
    output.split('\n').forEach((line) => {
        const match = line.match(/^\s*(\S[^:]+):\s*(.+)$/);
        if (match) {
            info[match[1].trim()] = match[2].trim();
        }
    });
    return info;
}
