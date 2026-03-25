import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate } from 'react-router-dom';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { RoutePaths } from '../general/RoutePaths';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { Loading } from '../components/Loading';

export function Groups() {
  const navigate = useNavigate();
  const { openAlert } = useAlert();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
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
    { header: 'Description', accessor: 'description' },
    {
      header: 'Members',
      accessor: 'memberCount',
      render(row) {
        return <span className="text-gray-400">{row.memberCount}</span>;
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
                navigate(RoutePaths.GROUP_EDIT.replace(':groupName', row.name));
              }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Edit
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <p className="mt-1 text-sm text-gray-400">Manage Active Directory groups</p>
        </div>
        <Button primary onClick={() => navigate(RoutePaths.GROUP_CREATE)}>
          New Group
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        searchPlaceholder="Search groups..."
      />

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
