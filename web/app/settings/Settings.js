import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';

export function Settings() {
  const { openAlert } = useAlert();
  const [fields, setFields] = useState({});
  const [syncAccount, setSyncAccount] = useState({ configured: false, username: '' });
  const [syncForm, setSyncForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSync, setSavingSync] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const [fieldsResult, syncResult] = await Promise.all([
          Meteor.callAsync('settings.get', { key: 'selfService.editableFields' }),
          Meteor.callAsync('settings.get', { key: 'sync.account' }),
        ]);
        setFields(fieldsResult || {});
        if (syncResult) {
          setSyncAccount(syncResult);
          setSyncForm((prev) => ({ ...prev, username: syncResult.username || '' }));
        }
      } catch (error) {
        openAlert(error.reason || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  function handleToggle({ fieldKey }) {
    setFields((prev) => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], enabled: !prev[fieldKey]?.enabled },
    }));
  }

  function handleLabelChange({ fieldKey, label }) {
    setFields((prev) => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], label },
    }));
  }

  async function handleSaveFields() {
    setSaving(true);
    try {
      await Meteor.callAsync('settings.set', {
        key: 'selfService.editableFields',
        value: fields,
      });
      openAlert('Settings saved successfully');
    } catch (error) {
      openAlert(error.reason || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSync(event) {
    event.preventDefault();
    if (!syncForm.username || !syncForm.password) {
      openAlert('Username and password are required');
      return;
    }

    setSavingSync(true);
    try {
      await Meteor.callAsync('settings.configureSyncAccount', {
        username: syncForm.username,
        password: syncForm.password,
      });
      setSyncAccount({ configured: true, username: syncForm.username });
      setSyncForm((prev) => ({ ...prev, password: '' }));
      openAlert('Sync account configured and verified successfully');
    } catch (error) {
      openAlert(error.reason || 'Failed to configure sync account. Check credentials.');
    } finally {
      setSavingSync(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Admin configuration</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Self-Service Editable Fields */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Self-Service Editable Fields</h2>
          <p className="text-sm text-gray-400 mb-6">
            Choose which profile fields users can edit in the self-service portal.
          </p>

          <div className="space-y-3">
            {Object.entries(fields).map(([key, config]) => (
              <div key={key} className="flex items-center gap-4 rounded-lg bg-gray-800/50 px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleToggle({ fieldKey: key })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    config.enabled ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs font-mono text-gray-500 w-40">{key}</span>
                <input
                  type="text"
                  value={config.label || ''}
                  onChange={(e) => handleLabelChange({ fieldKey: key, label: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Display label"
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button primary onClick={handleSaveFields} disabled={saving}>
              {saving ? 'Saving...' : 'Save Fields'}
            </Button>
          </div>
        </div>

        {/* Sync Account */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Sync Account</h2>
          <p className="text-sm text-gray-400 mb-4">
            Dedicated AD account for automated synchronization jobs.
            Create a user like <code className="text-gray-300">svc-conductor</code> in Active Directory
            with read permissions on the domain.
          </p>

          {syncAccount.configured && (
            <div className="mb-4 rounded-lg bg-green-900/30 border border-green-800 px-4 py-3 text-sm text-green-300">
              Configured: <strong>{syncAccount.username}</strong>
            </div>
          )}

          <form onSubmit={handleSaveSync} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={syncForm.username}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="svc-conductor"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={syncForm.password}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <Button primary type="submit" disabled={savingSync}>
              {savingSync ? 'Testing & Saving...' : 'Test & Save'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
