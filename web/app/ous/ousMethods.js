import {Meteor} from 'meteor/meteor';
import {check} from 'meteor/check';
import {getReadCredentials, getWriteCredentials} from '../auth/credentialStore';
import {
    listOUs,
    getOU,
    listOUObjects,
    createOU,
    deleteOU,
    renameOU,
    moveOU,
} from '../samba/sambaOUs';

Meteor.methods({
    // READ — fallback to sync account
    'samba.ous.list': async function listADOUs() {
        const credentials = await getReadCredentials({userId: this.userId});
        return listOUs({credentials});
    },

    // READ
    'samba.ous.get': async function getADOU({ouDn}) {
        const credentials = await getReadCredentials({userId: this.userId});
        check(ouDn, String);
        return getOU({ouDn, credentials});
    },

    // READ
    'samba.ous.listObjects': async function listADOUObjects({ouDn}) {
        const credentials = await getReadCredentials({userId: this.userId});
        check(ouDn, String);
        return listOUObjects({ouDn, credentials});
    },

    // WRITE — requires active session
    'samba.ous.create': async function createADOU({name, description, parentOu}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(name, String);
        await createOU({name, description, parentOu, credentials});
        return {success: true};
    },

    // WRITE
    'samba.ous.delete': async function deleteADOU({ouDn}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(ouDn, String);
        await deleteOU({ouDn, credentials});
        return {success: true};
    },

    // WRITE
    'samba.ous.rename': async function renameADOU({ouDn, newName}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(ouDn, String);
        check(newName, String);
        await renameOU({ouDn, newName, credentials});
        return {success: true};
    },

    // WRITE
    'samba.ous.move': async function moveADOU({ouDn, newParentDn}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(ouDn, String);
        check(newParentDn, String);
        await moveOU({ouDn, newParentDn, credentials});
        return {success: true};
    },
});
