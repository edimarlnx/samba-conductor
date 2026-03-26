import React, {useState, useEffect} from 'react';
import {Meteor} from 'meteor/meteor';
import {useAlert} from 'meteor/quave:alert-react-tailwind';
import {Button} from '../components/Button';
import {DataTable} from '../components/DataTable';
import {ConfirmModal} from '../components/ConfirmModal';
import {Loading} from '../components/Loading';
import {OUPicker} from '../components/OUPicker';

export function Computers() {
    const {openAlert} = useAlert();
    const [computers, setComputers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({name: '', description: '', computerOu: ''});
    const [creating, setCreating] = useState(false);

    // Detail view
    const [selected, setSelected] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    async function fetchComputers() {
        try {
            const result = await Meteor.callAsync('samba.computers.list');
            setComputers(result);
        } catch (error) {
            openAlert(error.reason || 'Failed to load computers');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchComputers();
    }, []);

    async function handleCreate() {
        if (!createForm.name.trim()) return;
        setCreating(true);
        try {
            await Meteor.callAsync('samba.computers.create', {
                computerName: createForm.name.trim(),
                description: createForm.description.trim() || undefined,
                computerOu: createForm.computerOu.trim() || undefined,
            });
            setCreateForm({name: '', description: '', computerOu: ''});
            setShowCreate(false);
            openAlert('Computer account created');
            await fetchComputers();
        } catch (error) {
            openAlert(error.reason || 'Failed to create computer');
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await Meteor.callAsync('samba.computers.delete', {computerName: deleteTarget});
            setDeleteTarget(null);
            if (selected?.name === deleteTarget) setSelected(null);
            await fetchComputers();
        } catch (error) {
            openAlert(error.reason || 'Failed to delete computer');
        }
    }

    async function handleSelectComputer({computerName}) {
        setLoadingDetail(true);
        try {
            const detail = await Meteor.callAsync('samba.computers.get', {computerName});
            setSelected(detail);
        } catch (error) {
            openAlert(error.reason || 'Failed to load details');
        } finally {
            setLoadingDetail(false);
        }
    }

    const columns = [
        {header: 'Name', accessor: 'name'},
        {header: 'OS', accessor: 'os'},
        {header: 'DNS Hostname', accessor: 'dnsHostName'},
        {
            header: 'Status',
            accessor: 'enabled',
            render(row) {
                return row.enabled ? (
                    <span
                        className="inline-flex rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">
            Enabled
          </span>
                ) : (
                    <span
                        className="inline-flex rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-400">
            Disabled
          </span>
                );
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
                                handleSelectComputer({computerName: row.name});
                            }}
                            className="text-xs text-accent hover:text-accent-hover"
                        >
                            Details
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

    if (loading) return <Loading/>;

    return (
        <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-fg">Computers</h1>
                    <p className="mt-1 text-sm text-fg-secondary">Manage domain-joined computer accounts</p>
                </div>
                <Button primary onClick={() => setShowCreate(true)}>
                    New Computer
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={computers}
                searchPlaceholder="Search computers..."
            />

            {/* Detail panel */}
            {selected && (
                <div className="mt-6 rounded-xl bg-surface-card border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-fg">{selected.name}</h2>
                        <button onClick={() => setSelected(null)}
                                className="text-sm text-fg-muted hover:text-fg">Close
                        </button>
                    </div>
                    {loadingDetail ? (
                        <Loading/>
                    ) : (
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <DetailField label="sAMAccountName" value={selected.sAMAccountName}/>
                            <DetailField label="DNS Hostname" value={selected.dnsHostName}/>
                            <DetailField label="Operating System" value={selected.os}/>
                            <DetailField label="OS Version" value={selected.osVersion}/>
                            <DetailField label="Description" value={selected.description}/>
                            <DetailField label="Status" value={selected.enabled ? 'Enabled' : 'Disabled'}/>
                            <DetailField label="Created" value={selected.whenCreated}/>
                            <DetailField label="Managed By" value={selected.managedBy}/>
                            <DetailField label="DN" value={selected.dn}/>
                            {selected.memberOf.length > 0 && (
                                <div className="sm:col-span-2">
                                    <dt className="text-xs font-medium text-fg-muted">Groups</dt>
                                    <dd className="mt-1 flex flex-wrap gap-1">
                                        {selected.memberOf.map((dn) => {
                                            const match = dn.match(/^CN=([^,]+)/);
                                            return (
                                                <span key={dn}
                                                      className="rounded-full bg-surface-input px-2 py-0.5 text-xs text-fg-secondary">
                          {match ? match[1] : dn}
                        </span>
                                            );
                                        })}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    )}
                </div>
            )}

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-4">New Computer Account</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Computer
                                    Name</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm((prev) => ({...prev, name: e.target.value}))}
                                    placeholder="WORKSTATION01"
                                    autoFocus
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
                                <input
                                    type="text"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm((prev) => ({...prev, description: e.target.value}))}
                                    placeholder="Optional"
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-fg-secondary mb-1">Organizational
                                Unit</label>
                              <OUPicker
                                    value={createForm.computerOu}
                                    onChange={(value) => setCreateForm((prev) => ({...prev, computerOu: value}))}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setShowCreate(false)}>Cancel</Button>
                            <Button primary onClick={handleCreate} disabled={creating || !createForm.name.trim()}>
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Delete Computer"
                message={`Are you sure you want to delete "${deleteTarget}"?`}
                confirmLabel="Delete"
                danger
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

function DetailField({label, value}) {
    if (!value) return null;
    return (
        <div>
            <dt className="text-xs font-medium text-fg-muted">{label}</dt>
            <dd className="mt-0.5 text-sm text-fg-secondary break-all">{value}</dd>
        </div>
    );
}
