import React, {useState, useEffect} from 'react';
import {Meteor} from 'meteor/meteor';
import {useAlert} from 'meteor/quave:alert-react-tailwind';
import {Button} from '../components/Button';
import {ConfirmModal} from '../components/ConfirmModal';
import {Loading} from '../components/Loading';

export function Dns() {
    const {openAlert} = useAlert();
    const [zones, setZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingRecords, setLoadingRecords] = useState(false);

    // Add record form
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({name: '', recordType: 'A', data: ''});
    const [adding, setAdding] = useState(false);

    // Delete record
    const [deleteTarget, setDeleteTarget] = useState(null);

    async function fetchZones() {
        try {
            const result = await Meteor.callAsync('samba.dns.listZones');
            setZones(result);
        } catch (error) {
            openAlert(error.reason || 'Failed to load DNS zones');
        } finally {
            setLoading(false);
        }
    }

    async function fetchRecords({zoneName}) {
        setLoadingRecords(true);
        try {
            const result = await Meteor.callAsync('samba.dns.listRecords', {zoneName});
            setRecords(result);
        } catch (error) {
            openAlert(error.reason || 'Failed to load records');
            setRecords([]);
        } finally {
            setLoadingRecords(false);
        }
    }

    useEffect(() => {
        fetchZones();
    }, []);

    function handleSelectZone({zoneName}) {
        setSelectedZone(zoneName);
        fetchRecords({zoneName});
    }

    async function handleAddRecord() {
        if (!addForm.name.trim() || !addForm.data.trim() || !selectedZone) return;
        setAdding(true);
        try {
            await Meteor.callAsync('samba.dns.addRecord', {
                zoneName: selectedZone,
                name: addForm.name.trim(),
                recordType: addForm.recordType,
                data: addForm.data.trim(),
            });
            setAddForm({name: '', recordType: 'A', data: ''});
            setShowAdd(false);
            openAlert('Record added');
            fetchRecords({zoneName: selectedZone});
        } catch (error) {
            openAlert(error.reason || 'Failed to add record');
        } finally {
            setAdding(false);
        }
    }

    async function handleDeleteRecord() {
        if (!deleteTarget || !selectedZone) return;
        try {
            await Meteor.callAsync('samba.dns.deleteRecord', {
                zoneName: selectedZone,
                name: deleteTarget.name,
                recordType: deleteTarget.type,
                data: deleteTarget.data,
            });
            setDeleteTarget(null);
            fetchRecords({zoneName: selectedZone});
        } catch (error) {
            openAlert(error.reason || 'Failed to delete record');
        }
    }

    if (loading) return <Loading/>;

    const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS'];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-fg">DNS Management</h1>
                <p className="mt-1 text-sm text-fg-secondary">Manage Active Directory DNS zones and records</p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Zones panel */}
                <div className="rounded-xl bg-surface-card border border-border p-4">
                    <h2 className="text-sm font-semibold text-fg mb-3">Zones</h2>
                    <div className="space-y-1">
                        {zones.map((zone) => (
                            <button
                                key={zone.name}
                                onClick={() => handleSelectZone({zoneName: zone.name})}
                                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                                    selectedZone === zone.name
                                        ? 'bg-accent/20 text-accent'
                                        : 'text-fg-secondary hover:bg-surface-hover'
                                }`}
                            >
                                <p className="font-medium truncate">{zone.name}</p>
                                <p className="text-xs text-fg-muted truncate">{zone.type}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Records panel */}
                <div className="lg:col-span-2 rounded-xl bg-surface-card border border-border p-4">
                    {selectedZone ? (
                        <div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                                <h2 className="text-sm font-semibold text-fg">{selectedZone}</h2>
                                <Button primary onClick={() => setShowAdd(true)}>
                                    Add Record
                                </Button>
                            </div>

                            {loadingRecords ? (
                                <Loading/>
                            ) : records.length === 0 ? (
                                <p className="text-sm text-fg-muted py-4 text-center">No records found</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                        <tr className="border-b border-border">
                                            <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted">Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted">Type</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted">Data</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted">TTL</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-fg-muted">Action</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-subtle">
                                        {records.map((rec, i) => (
                                            <tr key={`${rec.name}-${rec.type}-${i}`} className="hover:bg-surface-hover">
                                                <td className="px-3 py-2 text-fg-secondary font-mono">{rec.name}</td>
                                                <td className="px-3 py-2">
                            <span
                                className="inline-flex rounded bg-surface-input px-1.5 py-0.5 text-xs font-medium text-fg-muted">
                              {rec.type}
                            </span>
                                                </td>
                                                <td className="px-3 py-2 text-fg-secondary font-mono text-xs break-all">{rec.data}</td>
                                                <td className="px-3 py-2 text-fg-muted">{rec.ttl}s</td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        onClick={() => setDeleteTarget(rec)}
                                                        className="text-xs text-red-400 hover:text-red-300"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-fg-muted py-8 text-center">Select a zone to view records</p>
                    )}
                </div>
            </div>

            {/* Add record modal */}
            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-4">Add DNS Record</h3>
                        <p className="text-xs text-fg-muted mb-3">Zone: {selectedZone}</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Name</label>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={(e) => setAddForm((prev) => ({...prev, name: e.target.value}))}
                                    placeholder="www"
                                    autoFocus
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Type</label>
                                <select
                                    value={addForm.recordType}
                                    onChange={(e) => setAddForm((prev) => ({...prev, recordType: e.target.value}))}
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                >
                                    {recordTypes.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Data</label>
                                <input
                                    type="text"
                                    value={addForm.data}
                                    onChange={(e) => setAddForm((prev) => ({...prev, data: e.target.value}))}
                                    placeholder="192.168.1.10"
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setShowAdd(false)}>Cancel</Button>
                            <Button primary onClick={handleAddRecord}
                                    disabled={adding || !addForm.name.trim() || !addForm.data.trim()}>
                                {adding ? 'Adding...' : 'Add Record'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Delete DNS Record"
                message={`Delete ${deleteTarget?.type} record "${deleteTarget?.name}" → ${deleteTarget?.data}?`}
                confirmLabel="Delete"
                danger
                onConfirm={handleDeleteRecord}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
