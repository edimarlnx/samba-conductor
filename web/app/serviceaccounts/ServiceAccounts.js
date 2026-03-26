import React, {useState, useEffect} from 'react';
import {Meteor} from 'meteor/meteor';
import {useAlert} from 'meteor/quave:alert-react-tailwind';
import {Button} from '../components/Button';
import {DataTable} from '../components/DataTable';
import {ConfirmModal} from '../components/ConfirmModal';
import {Loading} from '../components/Loading';

export function ServiceAccounts() {
    const {openAlert} = useAlert();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({name: '', dnsHostName: '', passwordInterval: '30'});
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState(null);

    async function fetchAccounts() {
        try {
            const result = await Meteor.callAsync('samba.serviceAccounts.list');
            setAccounts(result);
        } catch (error) {
            openAlert(error.reason || 'Failed to load service accounts');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAccounts();
    }, []);

    async function handleCreate() {
        if (!createForm.name.trim() || !createForm.dnsHostName.trim()) return;
        setCreating(true);
        try {
            await Meteor.callAsync('samba.serviceAccounts.create', {
                name: createForm.name.trim(),
                dnsHostName: createForm.dnsHostName.trim(),
                passwordInterval: createForm.passwordInterval || undefined,
            });
            setCreateForm({name: '', dnsHostName: '', passwordInterval: '30'});
            setShowCreate(false);
            openAlert('Service account created');
            await fetchAccounts();
        } catch (error) {
            openAlert(error.reason || 'Failed to create service account');
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await Meteor.callAsync('samba.serviceAccounts.delete', {name: deleteTarget});
            setDeleteTarget(null);
            await fetchAccounts();
        } catch (error) {
            openAlert(error.reason || 'Failed to delete service account');
        }
    }

    async function handleViewDetails({accountName}) {
        try {
            const detail = await Meteor.callAsync('samba.serviceAccounts.get', {accountName});
            setSelected({name: accountName, ...detail});
        } catch (error) {
            openAlert(error.reason || 'Failed to load details');
        }
    }

    const columns = [
        {header: 'Name', accessor: 'name'},
        {header: 'DNS Hostname', accessor: 'dnsHostName'},
        {
            header: 'Password Interval',
            accessor: 'passwordInterval',
            render(row) {
                return row.passwordInterval ? `${row.passwordInterval} days` : '-';
            },
        },
        {
            header: 'Status',
            accessor: 'enabled',
            render(row) {
                return row.enabled ? (
                    <span
                        className="inline-flex rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">Active</span>
                ) : (
                    <span
                        className="inline-flex rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-400">Disabled</span>
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
                                handleViewDetails({accountName: row.name});
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
                    <h1 className="text-2xl font-bold text-fg">Service Accounts</h1>
                    <p className="mt-1 text-sm text-fg-secondary">Manage Group Managed Service Accounts (gMSA)</p>
                </div>
                <Button primary onClick={() => setShowCreate(true)}>
                    New gMSA
                </Button>
            </div>

            <DataTable columns={columns} data={accounts} searchPlaceholder="Search service accounts..."/>

            {/* Detail panel */}
            {selected && (
                <div className="mt-6 rounded-xl bg-surface-card border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-fg">{selected.name}</h2>
                        <button onClick={() => setSelected(null)}
                                className="text-sm text-fg-muted hover:text-fg">Close
                        </button>
                    </div>
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {Object.entries(selected).map(([key, value]) => {
                            if (key === 'name' || !value) return null;
                            return (
                                <div key={key}>
                                    <dt className="text-xs font-medium text-fg-muted">{key}</dt>
                                    <dd className="mt-0.5 text-sm text-fg-secondary break-all">{String(value)}</dd>
                                </div>
                            );
                        })}
                    </dl>
                </div>
            )}

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-4">New Group Managed Service Account</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Account Name</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm((prev) => ({...prev, name: e.target.value}))}
                                    placeholder="svc-myapp"
                                    autoFocus
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">DNS Hostname</label>
                                <input
                                    type="text"
                                    value={createForm.dnsHostName}
                                    onChange={(e) => setCreateForm((prev) => ({...prev, dnsHostName: e.target.value}))}
                                    placeholder="myapp.samdom.example.com"
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Password Interval
                                    (days)</label>
                                <input
                                    type="number"
                                    value={createForm.passwordInterval}
                                    onChange={(e) => setCreateForm((prev) => ({
                                        ...prev,
                                        passwordInterval: e.target.value
                                    }))}
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setShowCreate(false)}>Cancel</Button>
                            <Button primary onClick={handleCreate}
                                    disabled={creating || !createForm.name.trim() || !createForm.dnsHostName.trim()}>
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Delete Service Account"
                message={`Delete gMSA "${deleteTarget}"?`}
                confirmLabel="Delete"
                danger
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
