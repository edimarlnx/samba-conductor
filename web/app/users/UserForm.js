import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate, useParams } from 'react-router-dom';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { RoutePaths } from '../general/RoutePaths';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';

const INITIAL_FORM = {
  username: '',
  password: '',
  givenName: '',
  surname: '',
  initials: '',
  mail: '',
  company: '',
  department: '',
  description: '',
  telephoneNumber: '',
  physicalDeliveryOffice: '',
  userou: '',
  mustChangeAtNextLogin: false,
  // Unix/RFC2307 attributes
  unixHome: '',
  loginShell: '',
  uidNumber: '',
  gidNumber: '',
};

export function UserForm() {
  const navigate = useNavigate();
  const { username: editUsername } = useParams();
  const { openAlert } = useAlert();
  const isEditing = !!editUsername;

  const [form, setForm] = useState(INITIAL_FORM);
  const [groups, setGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing) return;

    async function fetchUser() {
      try {
        const [user, groupList] = await Promise.all([
          Meteor.callAsync('samba.users.get', { username: editUsername }),
          Meteor.callAsync('samba.groups.list'),
        ]);

        if (user) {
          setForm((prev) => ({
            ...prev,
            username: user.username,
            givenName: user.givenName || '',
            surname: user.surname || '',
            mail: user.email || '',
            description: user.description || '',
            company: user.company || '',
            department: user.department || '',
            telephoneNumber: user.telephoneNumber || '',
            physicalDeliveryOffice: user.physicalDeliveryOffice || '',
            initials: user.initials || '',
          }));

          // Extract group names from memberOf DNs
          const userGroups = (user.memberOf || []).map((dn) => {
            const match = dn.match(/^CN=([^,]+)/);
            return match ? match[1] : dn;
          });
          setGroups(userGroups);
        }

        setAllGroups(groupList.map((g) => g.name));
      } catch (error) {
        openAlert(error.reason || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [editUsername]);

  function handleChange({ field, value }) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (isEditing) {
        if (form.password) {
          await Meteor.callAsync('samba.users.resetPassword', {
            username: editUsername,
            newPassword: form.password,
          });
        }
        openAlert('User updated successfully');
      } else {
        await Meteor.callAsync('samba.users.create', {
          username: form.username,
          password: form.password,
          givenName: form.givenName,
          surname: form.surname,
          initials: form.initials,
          mail: form.mail,
          company: form.company,
          department: form.department,
          description: form.description,
          telephoneNumber: form.telephoneNumber,
          physicalDeliveryOffice: form.physicalDeliveryOffice,
          userou: form.userou,
          mustChangeAtNextLogin: form.mustChangeAtNextLogin,
          unixHome: form.unixHome,
          loginShell: form.loginShell,
          uidNumber: form.uidNumber,
          gidNumber: form.gidNumber,
        });
        openAlert('User created successfully');
      }

      navigate(RoutePaths.ADMIN_USERS);
    } catch (error) {
      openAlert(error.reason || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">
          {isEditing ? `Edit User: ${editUsername}` : 'New User'}
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {isEditing ? 'Update user properties' : 'Create a new Active Directory user'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-8">
        {/* Account */}
        <FormSection title="Account">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Username"
              value={form.username}
              onChange={(value) => handleChange({ field: 'username', value })}
              required
              disabled={isEditing}
              placeholder="john.doe"
            />
            <FormField
              label={isEditing ? 'New Password (blank = keep current)' : 'Password'}
              value={form.password}
              onChange={(value) => handleChange({ field: 'password', value })}
              type="password"
              required={!isEditing}
            />
          </div>
          {!isEditing && (
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.mustChangeAtNextLogin}
                  onChange={(e) => handleChange({ field: 'mustChangeAtNextLogin', value: e.target.checked })}
                  className="rounded border-border bg-surface-input text-accent focus:ring-accent"
                />
                Must change password at next login
              </label>
            </div>
          )}
        </FormSection>

        {/* Personal Information */}
        <FormSection title="Personal Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="First Name"
              value={form.givenName}
              onChange={(value) => handleChange({ field: 'givenName', value })}
              placeholder="John"
            />
            <FormField
              label="Initials"
              value={form.initials}
              onChange={(value) => handleChange({ field: 'initials', value })}
              placeholder="J.D."
            />
            <FormField
              label="Last Name"
              value={form.surname}
              onChange={(value) => handleChange({ field: 'surname', value })}
              placeholder="Doe"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
            <FormField
              label="Email"
              value={form.mail}
              onChange={(value) => handleChange({ field: 'mail', value })}
              type="email"
              placeholder="john.doe@example.com"
            />
            <FormField
              label="Phone"
              value={form.telephoneNumber}
              onChange={(value) => handleChange({ field: 'telephoneNumber', value })}
              placeholder="+55 11 99999-9999"
            />
          </div>
          <div className="mt-4">
            <FormField
              label="Description"
              value={form.description}
              onChange={(value) => handleChange({ field: 'description', value })}
              placeholder="User description"
            />
          </div>
        </FormSection>

        {/* Organization */}
        <FormSection title="Organization">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Company"
              value={form.company}
              onChange={(value) => handleChange({ field: 'company', value })}
              placeholder="Acme Corp"
            />
            <FormField
              label="Department"
              value={form.department}
              onChange={(value) => handleChange({ field: 'department', value })}
              placeholder="Engineering"
            />
            <FormField
              label="Office"
              value={form.physicalDeliveryOffice}
              onChange={(value) => handleChange({ field: 'physicalDeliveryOffice', value })}
              placeholder="Building A, Room 101"
            />
            {!isEditing && (
              <FormField
                label="Organizational Unit"
                value={form.userou}
                onChange={(value) => handleChange({ field: 'userou', value })}
                placeholder="OU=Engineering"
              />
            )}
          </div>
        </FormSection>

        {/* Unix/RFC2307 Attributes - only for creation */}
        {!isEditing && (
          <FormSection title="Unix Attributes (RFC2307)" collapsible>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Home Directory"
                value={form.unixHome}
                onChange={(value) => handleChange({ field: 'unixHome', value })}
                placeholder="/home/john.doe"
              />
              <FormField
                label="Login Shell"
                value={form.loginShell}
                onChange={(value) => handleChange({ field: 'loginShell', value })}
                placeholder="/bin/bash"
              />
              <FormField
                label="UID Number"
                value={form.uidNumber}
                onChange={(value) => handleChange({ field: 'uidNumber', value })}
                placeholder="10001"
              />
              <FormField
                label="GID Number"
                value={form.gidNumber}
                onChange={(value) => handleChange({ field: 'gidNumber', value })}
                placeholder="10000"
              />
            </div>
          </FormSection>
        )}

        <div className="flex gap-3 pt-2">
          <Button primary type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
          </Button>
          <Button secondary onClick={() => navigate(RoutePaths.ADMIN_USERS)} type="button">
            Cancel
          </Button>
        </div>
      </form>

      {/* Group Membership - only when editing */}
      {isEditing && (
        <UserGroupsSection
          username={editUsername}
          groups={groups}
          allGroups={allGroups}
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          onGroupsChange={setGroups}
          openAlert={openAlert}
        />
      )}
    </div>
  );
}

function UserGroupsSection({ username, groups, allGroups, selectedGroup, onSelectGroup, onGroupsChange, openAlert }) {
  const availableGroups = allGroups.filter((g) => !groups.includes(g));

  async function handleAddGroup() {
    if (!selectedGroup) return;

    try {
      await Meteor.callAsync('samba.groups.addMember', {
        groupName: selectedGroup,
        memberName: username,
      });
      onGroupsChange((prev) => [...prev, selectedGroup]);
      onSelectGroup('');
    } catch (error) {
      openAlert(error.reason || 'Failed to add to group');
    }
  }

  async function handleRemoveGroup({ groupName }) {
    try {
      await Meteor.callAsync('samba.groups.removeMember', {
        groupName,
        memberName: username,
      });
      onGroupsChange((prev) => prev.filter((g) => g !== groupName));
    } catch (error) {
      openAlert(error.reason || 'Failed to remove from group');
    }
  }

  return (
    <div className="mt-8 w-full max-w-2xl">
      <div className="rounded-xl bg-surface-card border border-border p-5">
        <h3 className="text-sm font-semibold text-fg mb-4">
          Group Membership ({groups.length})
        </h3>

        {/* Add to group */}
        <div className="flex gap-2 mb-4">
          <select
            value={selectedGroup}
            onChange={(e) => onSelectGroup(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Select a group to add...</option>
            {availableGroups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <Button secondary onClick={handleAddGroup} type="button" disabled={!selectedGroup}>
            Add
          </Button>
        </div>

        {/* Current groups */}
        <div className="rounded-lg border border-border divide-y divide-border">
          {groups.length === 0 ? (
            <p className="p-4 text-sm text-fg-muted">Not a member of any group</p>
          ) : (
            groups.map((groupName) => (
              <div key={groupName} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-fg-secondary">{groupName}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveGroup({ groupName })}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible);

  return (
    <div className="rounded-xl bg-surface-card border border-border p-5">
      <button
        type="button"
        onClick={() => collapsible && setOpen((prev) => !prev)}
        className={`text-sm font-semibold text-fg mb-4 w-full text-left flex items-center justify-between ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {title}
        {collapsible && (
          <span className="text-fg-muted text-xs">{open ? 'Hide' : 'Show'}</span>
        )}
      </button>
      {open && children}
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', required = false, disabled = false, placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-fg-secondary mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
      />
    </div>
  );
}
