import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate } from 'react-router-dom';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { RoutePaths } from '../general/RoutePaths';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { Loading } from '../components/Loading';

export function Users() {
  const navigate = useNavigate();
  const { openAlert } = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function fetchUsers() {
    try {
      const result = await Meteor.callAsync('samba.users.list');
      setUsers(result);
    } catch (error) {
      openAlert(error.reason || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleToggleStatus({ username, enabled }) {
    try {
      const method = enabled ? 'samba.users.disable' : 'samba.users.enable';
      await Meteor.callAsync(method, { username });
      await fetchUsers();
    } catch (error) {
      openAlert(error.reason || 'Failed to update user status');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await Meteor.callAsync('samba.users.delete', { username: deleteTarget });
      setDeleteTarget(null);
      await fetchUsers();
    } catch (error) {
      openAlert(error.reason || 'Failed to delete user');
    }
  }

  const columns = [
    { header: 'Username', accessor: 'username' },
    { header: 'Display Name', accessor: 'displayName' },
    {
      header: 'Status',
      accessor: 'enabled',
      render(row) {
        return row.enabled ? (
          <span className="inline-flex rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">
            Enabled
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-400">
            Disabled
          </span>
        );
      },
    },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Actions',
      render(row) {
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(RoutePaths.ADMIN_USER_EDIT.replace(':username', row.username));
              }}
              className="text-xs text-accent hover:text-accent-hover"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus({ username: row.username, enabled: row.enabled });
              }}
              className="text-xs text-yellow-400 hover:text-yellow-300"
            >
              {row.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row.username);
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Users</h1>
          <p className="mt-1 text-sm text-fg-secondary">Manage Active Directory users</p>
        </div>
        <Button primary onClick={() => navigate(RoutePaths.ADMIN_USER_CREATE)}>
          New User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Search users..."
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteTarget}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
