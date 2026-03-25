import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
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
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    return listGroups();
  },

  'samba.groups.get': async function getADGroup({ groupName }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(groupName, String);
    return getGroup({ groupName });
  },

  'samba.groups.create': async function createADGroup({ groupName, description }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(groupName, String);
    check(description, Match.Maybe(String));

    await createGroup({ groupName, description });
    return { success: true };
  },

  'samba.groups.delete': async function deleteADGroup({ groupName }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(groupName, String);

    await deleteGroup({ groupName });
    return { success: true };
  },

  'samba.groups.addMember': async function addADGroupMember({ groupName, memberName }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(groupName, String);
    check(memberName, String);

    await addGroupMember({ groupName, memberName });
    return { success: true };
  },

  'samba.groups.removeMember': async function removeADGroupMember({ groupName, memberName }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(groupName, String);
    check(memberName, String);

    await removeGroupMember({ groupName, memberName });
    return { success: true };
  },

  'samba.groups.listMembers': async function listADGroupMembers({ groupName }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    check(groupName, String);
    return listGroupMembers({ groupName });
  },
});
