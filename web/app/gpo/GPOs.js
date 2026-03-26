import React, {useState, useEffect} from 'react';
import {Meteor} from 'meteor/meteor';
import {useAlert} from 'meteor/quave:alert-react-tailwind';
import {Button} from '../components/Button';
import {ConfirmModal} from '../components/ConfirmModal';
import {Loading} from '../components/Loading';

export function GPOs() {
    const {openAlert} = useAlert();
    const [gpos, setGpos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [creating, setCreating] = useState(false);

    // Link form
    const [linkTarget, setLinkTarget] = useState(null);
    const [linkOuDn, setLinkOuDn] = useState('');

    async function fetchGPOs() {
        try {
            const result = await Meteor.callAsync('samba.gpo.listAll');
            setGpos(result);
        } catch (error) {
            openAlert(error.reason || 'Failed to load GPOs');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchGPOs();
    }, []);

    async function handleCreate() {
        if (!createName.trim()) return;
        setCreating(true);
        try {
            await Meteor.callAsync('samba.gpo.create', {displayName: createName.trim()});
            setCreateName('');
            setShowCreate(false);
            openAlert('GPO created');
            await fetchGPOs();
        } catch (error) {
            openAlert(error.reason || 'Failed to create GPO');
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await Meteor.callAsync('samba.gpo.delete', {gpoId: deleteTarget.id});
            setDeleteTarget(null);
            await fetchGPOs();
        } catch (error) {
            openAlert(error.reason || 'Failed to delete GPO');
        }
    }

    async function handleLink() {
        if (!linkTarget || !linkOuDn.trim()) return;
        try {
            await Meteor.callAsync('samba.gpo.link', {
                containerDn: linkOuDn.trim(),
                gpoId: linkTarget.id,
            });
            setLinkTarget(null);
            setLinkOuDn('');
            openAlert('GPO linked successfully');
        } catch (error) {
            openAlert(error.reason || 'Failed to link GPO');
        }
    }

    if (loading) return <Loading/>;

    return (
        <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-fg">Group Policy Objects</h1>
                    <p className="mt-1 text-sm text-fg-secondary">Manage domain GPOs and links</p>
                </div>
                <Button primary onClick={() => setShowCreate(true)}>
                    New GPO
                </Button>
            </div>

            {/* GPO list */}
            <div className="space-y-3">
                {gpos.length === 0 ? (
                    <div
                        className="rounded-xl bg-surface-card border border-border p-6 text-center text-sm text-fg-muted">
                        No GPOs found
                    </div>
                ) : (
                    gpos.map((gpo) => (
                        <div key={gpo.id} className="rounded-xl bg-surface-card border border-border p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-fg">{gpo.displayName}</h3>
                                    <p className="text-xs font-mono text-fg-muted mt-0.5">{gpo.id}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => {
                                            setLinkTarget(gpo);
                                            setLinkOuDn('');
                                        }}
                                        className="text-xs text-accent hover:text-accent-hover"
                                    >
                                        Link to OU
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(gpo)}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                                <span>Version: {gpo.version}</span>
                                <span>Flags: {gpo.flags}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-4">New Group Policy Object</h3>
                        <div>
                            <label className="block text-xs font-medium text-fg-secondary mb-1">Display Name</label>
                            <input
                                type="text"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                placeholder="Custom Policy"
                                autoFocus
                                className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setShowCreate(false)}>Cancel</Button>
                            <Button primary onClick={handleCreate} disabled={creating || !createName.trim()}>
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link modal */}
            {linkTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setLinkTarget(null)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-2">Link GPO</h3>
                        <p className="text-xs text-fg-muted mb-4">{linkTarget.displayName}</p>
                        <div>
                            <label className="block text-xs font-medium text-fg-secondary mb-1">Container DN
                                (OU)</label>
                            <input
                                type="text"
                                value={linkOuDn}
                                onChange={(e) => setLinkOuDn(e.target.value)}
                                placeholder="OU=Engineering,DC=samdom,DC=example,DC=com"
                                autoFocus
                                className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg font-mono placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setLinkTarget(null)}>Cancel</Button>
                            <Button primary onClick={handleLink} disabled={!linkOuDn.trim()}>Link</Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Delete GPO"
                message={`Delete "${deleteTarget?.displayName}"? This will also remove all links.`}
                confirmLabel="Delete"
                danger
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
