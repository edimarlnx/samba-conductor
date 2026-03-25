import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { getCredentials } from '../auth/credentialStore';
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
  'samba.groups.list': async function listADGroups() {
    const credentials = getCredentials({ userId: this.userId });
    return listGroups({ credentials });
  },

  'samba.groups.get': async function getADGroup({ groupName }) {
    const credentials = getCredentials({ userId: this.userId });
    check(groupName, String);
    return getGroup({ groupName, credentials });
  },

  'samba.groups.create': async function createADGroup({ groupName, description }) {
    const credentials = getCredentials({ userId: this.userId });
    check(groupName, String);
    check(description, Match.Maybe(String));
    await createGroup({ groupName, description, credentials });
    return { success: true };
  },

  'samba.groups.delete': async function deleteADGroup({ groupName }) {
    const credentials = getCredentials({ userId: this.userId });
    check(groupName, String);
    await deleteGroup({ groupName, credentials });
    return { success: true };
  },

  'samba.groups.addMember': async function addADGroupMember({ groupName, memberName }) {
    const credentials = getCredentials({ userId: this.userId });
    check(groupName, String);
    check(memberName, String);
    await addGroupMember({ groupName, memberName, credentials });
    return { success: true };
  },

  'samba.groups.removeMember': async function removeADGroupMember({ groupName, memberName }) {
    const credentials = getCredentials({ userId: this.userId });
    check(groupName, String);
    check(memberName, String);
    await removeGroupMember({ groupName, memberName, credentials });
    return { success: true };
  },

  'samba.groups.listMembers': async function listADGroupMembers({ groupName }) {
    const credentials = getCredentials({ userId: this.userId });
    check(groupName, String);
    return listGroupMembers({ groupName, credentials });
  },
});
