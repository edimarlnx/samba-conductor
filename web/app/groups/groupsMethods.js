import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { getReadCredentials, getWriteCredentials } from '../auth/credentialStore';
import {
  listGroups,
  getGroup,
  createGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  listGroupMembers,
} from '../samba/sambaGroups';

Meteor.methods({
  // READ — fallback to sync account
  'samba.groups.list': async function listADGroups() {
    const credentials = await getReadCredentials({ userId: this.userId });
    return listGroups({ credentials });
  },

  // READ — fallback to sync account
  'samba.groups.get': async function getADGroup({ groupName }) {
    const credentials = await getReadCredentials({ userId: this.userId });
    check(groupName, String);
    return getGroup({ groupName, credentials });
  },

  // WRITE — requires active session
  'samba.groups.create': async function createADGroup({ groupName, description }) {
    const credentials = getWriteCredentials({ userId: this.userId });
    check(groupName, String);
    check(description, Match.Maybe(String));
    await createGroup({ groupName, description, credentials });
    return { success: true };
  },

  // WRITE — requires active session
  'samba.groups.delete': async function deleteADGroup({ groupName }) {
    const credentials = getWriteCredentials({ userId: this.userId });
    check(groupName, String);
    await deleteGroup({ groupName, credentials });
    return { success: true };
  },

    // WRITE — move group to different OU
    'samba.groups.move': async function moveADGroup({groupName, newOuDn}) {
        const credentials = getWriteCredentials({userId: this.userId});
        check(groupName, String);
        check(newOuDn, String);
        const {moveGroup} = require('../samba/sambaGroups');
        await moveGroup({groupName, newOuDn, credentials});
        return {success: true};
    },

  // WRITE — requires active session
  'samba.groups.addMember': async function addADGroupMember({ groupName, memberName }) {
    const credentials = getWriteCredentials({ userId: this.userId });
    check(groupName, String);
    check(memberName, String);
    await addGroupMember({ groupName, memberName, credentials });
    return { success: true };
  },

  // WRITE — requires active session
  'samba.groups.removeMember': async function removeADGroupMember({ groupName, memberName }) {
    const credentials = getWriteCredentials({ userId: this.userId });
    check(groupName, String);
    check(memberName, String);
    await removeGroupMember({ groupName, memberName, credentials });
    return { success: true };
  },

  // READ — fallback to sync account
  'samba.groups.listMembers': async function listADGroupMembers({ groupName }) {
    const credentials = await getReadCredentials({ userId: this.userId });
    check(groupName, String);
    return listGroupMembers({ groupName, credentials });
  },
});
