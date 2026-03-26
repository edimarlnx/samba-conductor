import {Meteor} from 'meteor/meteor';
import {check} from 'meteor/check';
import {getReadCredentials, getWriteCredentials} from '../auth/credentialStore';
import {
    listAllGPOs, getGPOLinks, getGPOInheritance,
    createGPO, deleteGPO, linkGPO, unlinkGPO,
} from '../samba/sambaGpo';

Meteor.methods({
    'samba.gpo.listAll': async function listGPOs() {
        const credentials = await getReadCredentials({userId: this.userId});
        return listAllGPOs({credentials});
    },

    'samba.gpo.getLinks': async function getLinks({containerDn}) {
        const credentials = await getReadCredentials({userId: this.userId});
        check(containerDn, String);
        return getGPOLinks({containerDn, credentials});
    },

    'samba.gpo.getInheritance': async function getInheritance({containerDn}) {
        const credentials = await getReadCredentials({userId: this.userId});
        check(containerDn, String);
        return getGPOInheritance({containerDn, credentials});
    },

    'samba.gpo.create': async function createNewGPO({displayName}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(displayName, String);
        await createGPO({displayName, credentials});
        return {success: true};
    },

    'samba.gpo.delete': async function deleteExistingGPO({gpoId}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(gpoId, String);
        await deleteGPO({gpoId, credentials});
        return {success: true};
    },

    'samba.gpo.link': async function linkGPOToContainer({containerDn, gpoId}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(containerDn, String);
        check(gpoId, String);
        await linkGPO({containerDn, gpoId, credentials});
        return {success: true};
    },

    'samba.gpo.unlink': async function unlinkGPOFromContainer({containerDn, gpoId}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(containerDn, String);
        check(gpoId, String);
        await unlinkGPO({containerDn, gpoId, credentials});
        return {success: true};
    },
});
