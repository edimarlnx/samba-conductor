import React, {useState, useEffect} from 'react';
import {Meteor} from 'meteor/meteor';
import {useAlert} from 'meteor/quave:alert-react-tailwind';
import {Button} from '../components/Button';
import {DataTable} from '../components/DataTable';
import {ConfirmModal} from '../components/ConfirmModal';
import {Loading} from '../components/Loading';

const AVAILABLE_SCOPES = ['openid', 'profile', 'email', 'groups', 'phone'];

export function OAuthClients() {
    const {openAlert} = useAlert();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        clientName: '', description: '', redirectUri: '', realm: 'default',
        scopes: ['openid', 'profile', 'email'], trusted: false,
    });
    const [creating, setCreating] = useState(false);
    const [createdSecret, setCreatedSecret] = useState(null);
    const [realms, setRealms] = useState([]);

    async function fetchClients() {
        try {
            const result = await Meteor.callAsync('oauth.clients.list');
            setClients(result);
        } catch (error) {
            openAlert(error.reason || 'Failed to load OAuth clients');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchClients();
        Meteor.callAsync('oauth.realms.list').then(setRealms).catch(() => {
        });
    }, []);

    async function handleCreate() {
        if (!createForm.clientName.trim() || !createForm.redirectUri.trim()) return;
        setCreating(true);
        try {
            const result = await Meteor.callAsync('oauth.clients.create', {
                clientName: createForm.clientName.trim(),
                description: createForm.description.trim(),
                redirectUris: createForm.redirectUri.split('\n').map((u) => u.trim()).filter(Boolean),
                realm: createForm.realm,
                scopes: createForm.scopes,
                trusted: createForm.trusted,
            });
            setCreatedSecret(result);
            await fetchClients();
        } catch (error) {
            openAlert(error.reason || 'Failed to create client');
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await Meteor.callAsync('oauth.clients.delete', {clientId: deleteTarget});
            setDeleteTarget(null);
            await fetchClients();
        } catch (error) {
            openAlert(error.reason || 'Failed to delete client');
        }
    }

    async function handleResetSecret({clientId}) {
        try {
            const result = await Meteor.callAsync('oauth.clients.resetSecret', {clientId});
            setCreatedSecret({clientId, clientSecret: result.clientSecret});
        } catch (error) {
            openAlert(error.reason || 'Failed to reset secret');
        }
    }

    function handleCopySecret() {
        if (createdSecret?.clientSecret) {
            navigator.clipboard.writeText(createdSecret.clientSecret);
            openAlert('Secret copied to clipboard');
        }
    }

    const columns = [
        {header: 'Name', accessor: 'clientName'},
        {
            header: 'Client ID', accessor: 'clientId', render(row) {
                return <code className="text-xs">{row.clientId}</code>;
            }
        },
        {header: 'Realm', accessor: 'realm'},
        {
            header: 'Status', accessor: 'enabled',
            render(row) {
                return row.enabled
                    ? <span
                        className="inline-flex rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">Active</span>
                    : <span
                        className="inline-flex rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-400">Disabled</span>;
            },
        },
        {
            header: 'Actions',
            render(row) {
                return (
                    <div className="flex gap-2">
                        <button onClick={(e) => {
                            e.stopPropagation();
                            handleResetSecret({clientId: row.clientId});
                        }} className="text-xs text-accent hover:text-accent-hover">Reset Secret
                        </button>
                        <button onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(row.clientId);
                        }} className="text-xs text-red-400 hover:text-red-300">Delete
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
                    <h1 className="text-2xl font-bold text-fg">OAuth Clients</h1>
                    <p className="mt-1 text-sm text-fg-secondary">Manage OAuth2 client applications</p>
                </div>
                <Button primary onClick={() => {
                    setShowCreate(true);
                    setCreatedSecret(null);
                }}>New Client</Button>
            </div>

            <DataTable columns={columns} data={clients} searchPlaceholder="Search clients..."/>

            {/* Created/Reset Secret Modal */}
            {createdSecret && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setCreatedSecret(null)}/>
                    <div
                        className="relative w-full max-w-lg rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-2">Client Credentials</h3>
                        <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 mb-4">
                            <p className="text-sm font-semibold text-red-300">Save these credentials now!</p>
                            <p className="text-xs text-red-400">The secret will NOT be shown again.</p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-fg-muted mb-1">Client ID</label>
                                <code
                                    className="block w-full rounded-lg bg-surface-input border border-border px-3 py-2 text-sm text-fg font-mono break-all select-all">{createdSecret.clientId}</code>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-muted mb-1">Client Secret</label>
                                <div className="flex gap-2">
                                    <code
                                        className="flex-1 rounded-lg bg-surface-input border border-border px-3 py-2 text-sm text-green-400 font-mono break-all select-all">{createdSecret.clientSecret}</code>
                                    <Button secondary onClick={handleCopySecret}>Copy</Button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button primary onClick={() => {
                                setCreatedSecret(null);
                                setShowCreate(false);
                                setCreateForm({
                                    clientName: '',
                                    description: '',
                                    redirectUri: '',
                                    realm: 'default',
                                    scopes: ['openid', 'profile', 'email'],
                                    trusted: false
                                });
                            }}>Done</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreate && !createdSecret && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-4">New OAuth Client</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Client Name</label>
                                <input type="text" value={createForm.clientName}
                                       onChange={(e) => setCreateForm((p) => ({...p, clientName: e.target.value}))}
                                       placeholder="Grafana" autoFocus
                                       className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Description</label>
                                <input type="text" value={createForm.description}
                                       onChange={(e) => setCreateForm((p) => ({...p, description: e.target.value}))}
                                       placeholder="Optional"
                                       className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Redirect URIs (one
                                    per line)</label>
                                <textarea value={createForm.redirectUri}
                                          onChange={(e) => setCreateForm((p) => ({...p, redirectUri: e.target.value}))}
                                          placeholder="http://localhost:3001/callback" rows={3}
                                          className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Realm</label>
                                <select
                                    value={createForm.realm}
                                    onChange={(e) => setCreateForm((p) => ({...p, realm: e.target.value}))}
                                    className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                >
                                    {realms.length === 0 ? (
                                        <option value="default">default</option>
                                    ) : (
                                        realms.map((r) => (
                                            <option key={r.name} value={r.name}>{r.displayName} ({r.name})</option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Scopes</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_SCOPES.map((scope) => (
                                        <label key={scope}
                                               className="flex items-center gap-1.5 text-sm text-fg-secondary cursor-pointer">
                                            <input type="checkbox" checked={createForm.scopes.includes(scope)}
                                                   onChange={(e) => {
                                                       setCreateForm((p) => ({
                                                           ...p,
                                                           scopes: e.target.checked ? [...p.scopes, scope] : p.scopes.filter((s) => s !== scope)
                                                       }));
                                                   }}
                                                   className="rounded border-border bg-surface-input text-accent focus:ring-accent"/>
                                            {scope}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
                                <input type="checkbox" checked={createForm.trusted}
                                       onChange={(e) => setCreateForm((p) => ({...p, trusted: e.target.checked}))}
                                       className="rounded border-border bg-surface-input text-accent focus:ring-accent"/>
                                Trusted (skip consent screen)
                            </label>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setShowCreate(false)}>Cancel</Button>
                            <Button primary onClick={handleCreate}
                                    disabled={creating || !createForm.clientName.trim() || !createForm.redirectUri.trim()}>{creating ? 'Creating...' : 'Create Client'}</Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal isOpen={!!deleteTarget} title="Delete OAuth Client"
                          message="This will revoke all tokens for this client." confirmLabel="Delete" danger
                          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}/>
        </div>
    );
}
