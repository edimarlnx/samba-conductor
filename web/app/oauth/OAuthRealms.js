import React, {useState, useEffect} from 'react';
import {Meteor} from 'meteor/meteor';
import {useAlert} from 'meteor/quave:alert-react-tailwind';
import {Button} from '../components/Button';
import {ConfirmModal} from '../components/ConfirmModal';
import {Loading} from '../components/Loading';

const ALL_SCOPES = ['openid', 'profile', 'email', 'groups', 'phone', 'ad_attributes'];

export function OAuthRealms() {
    const {openAlert} = useAlert();
    const [realms, setRealms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({
        name: '',
        displayName: '',
        description: '',
        allowedScopes: ['openid', 'profile', 'email', 'groups'],
        adGroupAccess: ''
    });
    const [saving, setSaving] = useState(false);

    async function fetchRealms() {
        try {
            setRealms(await Meteor.callAsync('oauth.realms.list'));
        } catch (error) {
            openAlert(error.reason || 'Failed to load realms');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchRealms();
    }, []);

    async function handleCreate() {
        if (!form.name.trim() || !form.displayName.trim()) return;
        setSaving(true);
        try {
            await Meteor.callAsync('oauth.realms.create', {
                name: form.name.trim(), displayName: form.displayName.trim(),
                description: form.description.trim(), allowedScopes: form.allowedScopes,
                adGroupAccess: form.adGroupAccess.trim() || undefined,
            });
            setForm({
                name: '',
                displayName: '',
                description: '',
                allowedScopes: ['openid', 'profile', 'email', 'groups'],
                adGroupAccess: ''
            });
            setShowCreate(false);
            openAlert('Realm created');
            await fetchRealms();
        } catch (error) {
            openAlert(error.reason || 'Failed to create realm');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await Meteor.callAsync('oauth.realms.delete', {name: deleteTarget});
            setDeleteTarget(null);
            await fetchRealms();
        } catch (error) {
            openAlert(error.reason || 'Failed to delete realm');
        }
    }

    if (loading) return <Loading/>;

    return (
        <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-fg">OAuth Realms</h1>
                    <p className="mt-1 text-sm text-fg-secondary">Logical grouping for OAuth clients</p>
                </div>
                <Button primary onClick={() => setShowCreate(true)}>New Realm</Button>
            </div>

            <div className="space-y-3">
                {realms.length === 0 ? (
                    <div
                        className="rounded-xl bg-surface-card border border-border p-6 text-center text-sm text-fg-muted">No
                        realms configured</div>
                ) : realms.map((realm) => (
                    <div key={realm.name} className="rounded-xl bg-surface-card border border-border p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-fg">{realm.displayName}</h3>
                                <p className="text-xs text-fg-muted">{realm.name}{realm.description ? ` — ${realm.description}` : ''}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {realm.name !== 'default' && (
                                    <button onClick={() => setDeleteTarget(realm.name)}
                                            className="text-xs text-red-400 hover:text-red-300">Delete</button>
                                )}
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {realm.allowedScopes.map((s) => (
                                <span key={s}
                                      className="rounded bg-surface-input px-1.5 py-0.5 text-xs text-fg-muted">{s}</span>
                            ))}
                        </div>
                        {realm.adGroupAccess &&
                            <p className="mt-1 text-xs text-fg-muted">Restricted to: {realm.adGroupAccess}</p>}
                    </div>
                ))}
            </div>

            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)}/>
                    <div
                        className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-fg mb-4">New Realm</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Name
                                    (identifier)</label>
                                <input type="text" value={form.name}
                                       onChange={(e) => setForm((p) => ({...p, name: e.target.value}))}
                                       placeholder="production"
                                       className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Display Name</label>
                                <input type="text" value={form.displayName}
                                       onChange={(e) => setForm((p) => ({...p, displayName: e.target.value}))}
                                       placeholder="Production Apps"
                                       className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">Allowed
                                    Scopes</label>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_SCOPES.map((scope) => (
                                        <label key={scope}
                                               className="flex items-center gap-1.5 text-sm text-fg-secondary cursor-pointer">
                                            <input type="checkbox" checked={form.allowedScopes.includes(scope)}
                                                   onChange={(e) => setForm((p) => ({
                                                       ...p,
                                                       allowedScopes: e.target.checked ? [...p.allowedScopes, scope] : p.allowedScopes.filter((s) => s !== scope)
                                                   }))}
                                                   className="rounded border-border bg-surface-input text-accent focus:ring-accent"/>
                                            {scope}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg-secondary mb-1">AD Group Restriction
                                    (optional)</label>
                                <input type="text" value={form.adGroupAccess}
                                       onChange={(e) => setForm((p) => ({...p, adGroupAccess: e.target.value}))}
                                       placeholder="CN=OAuth-Users,CN=Users,DC=..."
                                       className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"/>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button secondary onClick={() => setShowCreate(false)}>Cancel</Button>
                            <Button primary onClick={handleCreate}
                                    disabled={saving || !form.name.trim() || !form.displayName.trim()}>{saving ? 'Creating...' : 'Create'}</Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal isOpen={!!deleteTarget} title="Delete Realm"
                          message={`Delete "${deleteTarget}"? Clients in this realm will need to be reassigned.`}
                          confirmLabel="Delete" danger onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}/>
        </div>
    );
}
