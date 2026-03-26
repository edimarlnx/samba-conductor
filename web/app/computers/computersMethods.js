import {Meteor} from 'meteor/meteor';
import {check, Match} from 'meteor/check';
import {getReadCredentials, getWriteCredentials} from '../auth/credentialStore';
import {
    listComputers,
    getComputer,
    createComputer,
    deleteComputer,
    moveComputer,
} from '../samba/sambaComputers';

Meteor.methods({
    'samba.computers.list': async function listADComputers() {
        const credentials = await getReadCredentials({userId: this.userId});
        return listComputers({credentials});
    },

    'samba.computers.get': async function getADComputer({computerName}) {
        const credentials = await getReadCredentials({userId: this.userId});
        check(computerName, String);
        return getComputer({computerName, credentials});
    },

    'samba.computers.create': async function createADComputer({computerName, description, computerOu}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(computerName, String);
        check(description, Match.Maybe(String));
        check(computerOu, Match.Maybe(String));
        await createComputer({computerName, description, computerOu, credentials});
        return {success: true};
    },

    'samba.computers.delete': async function deleteADComputer({computerName}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(computerName, String);
        await deleteComputer({computerName, credentials});
        return {success: true};
    },

    'samba.computers.move': async function moveADComputer({computerName, newOuDn}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(computerName, String);
        check(newOuDn, String);
        await moveComputer({computerName, newOuDn, credentials});
        return {success: true};
    },
});
