import {Meteor} from 'meteor/meteor';
import {check} from 'meteor/check';
import {getReadCredentials, getWriteCredentials} from '../auth/credentialStore';
import {
    listZones, getZoneInfo, listRecords,
    addRecord, deleteRecord, updateRecord,
    createZone, deleteZone,
} from '../samba/sambaDns';

Meteor.methods({
    'samba.dns.listZones': async function listDnsZones() {
        const credentials = await getReadCredentials({userId: this.userId});
        return listZones({credentials});
    },

    'samba.dns.getZoneInfo': async function getDnsZoneInfo({zoneName}) {
        const credentials = await getReadCredentials({userId: this.userId});
        check(zoneName, String);
        return getZoneInfo({zoneName, credentials});
    },

    'samba.dns.listRecords': async function listDnsRecords({zoneName, name}) {
        const credentials = await getReadCredentials({userId: this.userId});
        check(zoneName, String);
        return listRecords({zoneName, name, credentials});
    },

    'samba.dns.addRecord': async function addDnsRecord({zoneName, name, recordType, data}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(zoneName, String);
        check(name, String);
        check(recordType, String);
        check(data, String);
        await addRecord({zoneName, name, recordType, data, credentials});
        return {success: true};
    },

    'samba.dns.deleteRecord': async function deleteDnsRecord({zoneName, name, recordType, data}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(zoneName, String);
        check(name, String);
        check(recordType, String);
        check(data, String);
        await deleteRecord({zoneName, name, recordType, data, credentials});
        return {success: true};
    },

    'samba.dns.createZone': async function createDnsZone({zoneName}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(zoneName, String);
        await createZone({zoneName, credentials});
        return {success: true};
    },

    'samba.dns.deleteZone': async function deleteDnsZone({zoneName}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(zoneName, String);
        await deleteZone({zoneName, credentials});
        return {success: true};
    },
});
