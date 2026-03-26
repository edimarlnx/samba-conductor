import {Meteor} from 'meteor/meteor';
import {check, Match} from 'meteor/check';
import {getReadCredentials, getWriteCredentials} from '../auth/credentialStore';
import {
    listServiceAccounts,
    getServiceAccount,
    createServiceAccount,
    deleteServiceAccount,
    modifyServiceAccount,
} from '../samba/sambaServiceAccounts';

Meteor.methods({
    'samba.serviceAccounts.list': async function listGMSAs() {
        const credentials = await getReadCredentials({userId: this.userId});
        return listServiceAccounts({credentials});
    },

    'samba.serviceAccounts.get': async function getGMSA({accountName}) {
        const credentials = await getReadCredentials({userId: this.userId});
        check(accountName, String);
        return getServiceAccount({accountName, credentials});
    },

    'samba.serviceAccounts.create': async function createGMSA({name, dnsHostName, passwordInterval}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(name, String);
        check(dnsHostName, String);
        check(passwordInterval, Match.Maybe(String));
        await createServiceAccount({name, dnsHostName, passwordInterval, credentials});
        return {success: true};
    },

    'samba.serviceAccounts.delete': async function deleteGMSA({name}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(name, String);
        await deleteServiceAccount({name, credentials});
        return {success: true};
    },

    'samba.serviceAccounts.modify': async function modifyGMSA({name, dnsHostName, passwordInterval}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(name, String);
        check(dnsHostName, Match.Maybe(String));
        check(passwordInterval, Match.Maybe(String));
        await modifyServiceAccount({name, dnsHostName, passwordInterval, credentials});
        return {success: true};
    },
});
