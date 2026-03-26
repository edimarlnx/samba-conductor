import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate } from 'react-router-dom';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { RoutePaths } from '../general/RoutePaths';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { Loading } from '../components/Loading';
import {OUPicker} from '../components/OUPicker';

export function Users() {
  const navigate = useNavigate();
  const { openAlert } = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
    const [moveTarget, setMoveTarget] = useState(null);
    const [moveOuDn, setMoveOuDn] = useState('');
    const [toggleTarget, setToggleTarget] = useState(null);
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
                  setToggleTarget({username: row.username, enabled: row.enabled});
              }}
              className="text-xs text-yellow-400 hover:text-yellow-300"
            >
              {row.enabled ? 'Disable' : 'Enable'}
            </button>
              <button
                  onClick={(e) => {
                      e.stopPropagation();
                      setMoveTarget(row.username);
                      setMoveOuDn('');
                  }}
                  className="text-xs text-fg-muted hover:text-fg-secondary"
              >
                  Move
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

        {/* Move to OU modal */}
        {moveTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60" onClick={() => setMoveTarget(null)}/>
                <div
                    className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                    <h3 className="text-lg font-semibold text-fg mb-2">Move User</h3>
                    <p className="text-xs text-fg-muted mb-4">Move "{moveTarget}" to a different OU</p>
                    <OUPicker
                        value={moveOuDn}
                        onChange={(value) => setMoveOuDn(value)}
                        placeholder="Select destination OU"
                    />
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button secondary onClick={() => setMoveTarget(null)}>Cancel</Button>
                        <Button
                            primary
                            disabled={!moveOuDn}
                            onClick={async () => {
                                try {
                                    await Meteor.callAsync('samba.users.move', {
                                        username: moveTarget,
                                        newOuDn: moveOuDn
                                    });
                                    openAlert('User moved successfully');
                                    setMoveTarget(null);
                                    await fetchUsers();
                                } catch (error) {
                                    openAlert(error.reason || 'Failed to move user');
                                }
                            }}
                        >
                            Move
                        </Button>
                    </div>
                </div>
            </div>
        )}

        <ConfirmModal
            isOpen={!!toggleTarget}
            title={toggleTarget?.enabled ? 'Disable User' : 'Enable User'}
            message={toggleTarget?.enabled
                ? `Disable "${toggleTarget?.username}"? The user will not be able to log in.`
                : `Enable "${toggleTarget?.username}"? The user will be able to log in again.`
            }
            confirmLabel={toggleTarget?.enabled ? 'Disable' : 'Enable'}
            danger={toggleTarget?.enabled}
            onConfirm={async () => {
                await handleToggleStatus({username: toggleTarget.username, enabled: toggleTarget.enabled});
                setToggleTarget(null);
            }}
            onCancel={() => setToggleTarget(null)}
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
