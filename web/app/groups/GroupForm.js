import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate, useParams } from 'react-router-dom';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { RoutePaths } from '../general/RoutePaths';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';

export function GroupForm() {
  const navigate = useNavigate();
  const { groupName: editGroupName } = useParams();
  const { openAlert } = useAlert();
  const isEditing = !!editGroupName;

  const [form, setForm] = useState({ groupName: '', description: '' });
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing) return;

    async function fetchGroup() {
      try {
        const group = await Meteor.callAsync('samba.groups.get', { groupName: editGroupName });
        if (group) {
          setForm({
            groupName: group.name,
            description: group.description || '',
          });
          // Extract member names from DNs
          const memberNames = group.members.map((dn) => {
            const match = dn.match(/^CN=([^,]+)/);
            return match ? match[1] : dn;
          });
          setMembers(memberNames);
        }
      } catch (error) {
        openAlert(error.reason || 'Failed to load group');
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, [editGroupName]);

  function handleChange({ field, value }) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!isEditing) {
        await Meteor.callAsync('samba.groups.create', {
          groupName: form.groupName,
          description: form.description,
        });
        openAlert('Group created successfully');
      }

      navigate(RoutePaths.ADMIN_GROUPS);
    } catch (error) {
      openAlert(error.reason || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMember() {
    if (!newMember.trim()) return;

    try {
      await Meteor.callAsync('samba.groups.addMember', {
        groupName: editGroupName,
        memberName: newMember.trim(),
      });
      setMembers((prev) => [...prev, newMember.trim()]);
      setNewMember('');
    } catch (error) {
      openAlert(error.reason || 'Failed to add member');
    }
  }

  async function handleRemoveMember({ memberName }) {
    try {
      await Meteor.callAsync('samba.groups.removeMember', {
        groupName: editGroupName,
        memberName,
      });
      setMembers((prev) => prev.filter((m) => m !== memberName));
    } catch (error) {
      openAlert(error.reason || 'Failed to remove member');
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">
          {isEditing ? `Edit Group: ${editGroupName}` : 'New Group'}
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {isEditing ? 'Manage group properties and members' : 'Create a new Active Directory group'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-5">
        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">
            Group Name
          </label>
          <input
            type="text"
            value={form.groupName}
            onChange={(e) => handleChange({ field: 'groupName', value: e.target.value })}
            required
            disabled={isEditing}
            placeholder="developers"
            className="w-full rounded-lg border border-border bg-surface-input px-4 py-2.5 text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-secondary mb-1">
            Description
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => handleChange({ field: 'description', value: e.target.value })}
            placeholder="Group description"
            className="w-full rounded-lg border border-border bg-surface-input px-4 py-2.5 text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {!isEditing && (
          <div className="flex gap-3 pt-4">
            <Button primary type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Group'}
            </Button>
            <Button secondary onClick={() => navigate(RoutePaths.ADMIN_GROUPS)} type="button">
              Cancel
            </Button>
          </div>
        )}
      </form>

      {/* Members section - only when editing */}
      {isEditing && (
        <div className="mt-8 w-full max-w-lg">
          <h2 className="text-lg font-semibold text-fg mb-4">
            Members ({members.length})
          </h2>

          {/* Add member */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              placeholder="Username to add"
              className="flex-1 rounded-lg border border-border bg-surface-input px-4 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMember();
                }
              }}
            />
            <Button secondary onClick={handleAddMember} type="button">
              Add
            </Button>
          </div>

          {/* Members list */}
          <div className="rounded-xl border border-border divide-y divide-border">
            {members.length === 0 ? (
              <p className="p-4 text-sm text-fg-muted">No members</p>
            ) : (
              members.map((member) => (
                <div key={member} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-fg-secondary">{member}</span>
                  <button
                    onClick={() => handleRemoveMember({ memberName: member })}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3 pt-6">
            <Button secondary onClick={() => navigate(RoutePaths.ADMIN_GROUPS)} type="button">
              Back to Groups
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
