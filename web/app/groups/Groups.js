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

export function Groups() {
  const navigate = useNavigate();
  const { openAlert } = useAlert();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
    const [moveTarget, setMoveTarget] = useState(null);
    const [moveOuDn, setMoveOuDn] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function fetchGroups() {
    try {
      const result = await Meteor.callAsync('samba.groups.list');
      setGroups(result);
    } catch (error) {
      openAlert(error.reason || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await Meteor.callAsync('samba.groups.delete', { groupName: deleteTarget });
      setDeleteTarget(null);
      await fetchGroups();
    } catch (error) {
      openAlert(error.reason || 'Failed to delete group');
    }
  }

  const columns = [
    { header: 'Name', accessor: 'name' },
      {
          header: 'Description',
          accessor: 'description',
          render(row) {
              return <span className="block max-w-xs text-wrap break-words">{row.description}</span>;
          },
      },
    {
      header: 'Members',
      accessor: 'memberCount',
      render(row) {
        return <span className="text-fg-secondary">{row.memberCount}</span>;
      },
    },
    {
      header: 'Actions',
      render(row) {
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(RoutePaths.ADMIN_GROUP_EDIT.replace(':groupName', row.name));
              }}
              className="text-xs text-accent hover:text-accent-hover"
            >
              Edit
            </button>
              <button
                  onClick={(e) => {
                      e.stopPropagation();
                      setMoveTarget(row.name);
                      setMoveOuDn('');
                  }}
                  className="text-xs text-fg-muted hover:text-fg-secondary"
              >
                  Move
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row.name);
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
          <h1 className="text-2xl font-bold text-fg">Groups</h1>
          <p className="mt-1 text-sm text-fg-secondary">Manage Active Directory groups</p>
        </div>
        <Button primary onClick={() => navigate(RoutePaths.ADMIN_GROUP_CREATE)}>
          New Group
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        searchPlaceholder="Search groups..."
      />

        {/* Move to OU modal */}
        {moveTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60" onClick={() => setMoveTarget(null)}/>
                <div
                    className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                    <h3 className="text-lg font-semibold text-fg mb-2">Move Group</h3>
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
                                    await Meteor.callAsync('samba.groups.move', {
                                        groupName: moveTarget,
                                        newOuDn: moveOuDn
                                    });
                                    openAlert('Group moved successfully');
                                    setMoveTarget(null);
                                    await fetchGroups();
                                } catch (error) {
                                    openAlert(error.reason || 'Failed to move group');
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
        isOpen={!!deleteTarget}
        title="Delete Group"
        message={`Are you sure you want to delete "${deleteTarget}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
