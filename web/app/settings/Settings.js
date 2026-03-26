import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';

export function Settings() {
  const { openAlert } = useAlert();
  const [fields, setFields] = useState({});
  const [syncAccount, setSyncAccount] = useState({ configured: false, username: '' });
  const [syncUsername, setSyncUsername] = useState('svc-conductor');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSync, setSavingSync] = useState(false);
  const [resettingSync, setResettingSync] = useState(false);

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
          if (syncResult.username) setSyncUsername(syncResult.username);
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

  async function handleCreateSync() {
    if (!syncUsername.trim()) {
      openAlert('Username is required');
      return;
    }

    setSavingSync(true);
    try {
      await Meteor.callAsync('settings.configureSyncAccount', {
        username: syncUsername.trim(),
      });
      setSyncAccount({ configured: true, username: syncUsername.trim() });
      openAlert('Sync account created with auto-generated password');
    } catch (error) {
      openAlert(error.reason || 'Failed to create sync account');
    } finally {
      setSavingSync(false);
    }
  }

  async function handleResetSyncPassword() {
    setResettingSync(true);
    try {
      await Meteor.callAsync('settings.resetSyncPassword');
      openAlert('Sync account password has been reset');
    } catch (error) {
      openAlert(error.reason || 'Failed to reset sync password');
    } finally {
      setResettingSync(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
        <p className="mt-1 text-sm text-fg-secondary">Admin configuration</p>
      </div>

      <div className="w-full max-w-2xl space-y-8">
        {/* Self-Service Editable Fields */}
        <div className="rounded-xl bg-surface-card border border-border p-6">
          <h2 className="text-lg font-semibold text-fg mb-2">Self-Service Editable Fields</h2>
          <p className="text-sm text-fg-secondary mb-6">
            Choose which profile fields users can edit in the self-service portal.
          </p>

          <div className="space-y-3">
            {Object.entries(fields).map(([key, config]) => (
              <div key={key} className="rounded-lg bg-surface-input/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle({ fieldKey: key })}
                    data-e2e={`settings-toggle-${key}`}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      config.enabled ? 'bg-accent' : 'bg-surface-hover'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                        config.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-mono text-fg-muted truncate">{key}</span>
                </div>
                <input
                  type="text"
                  value={config.label || ''}
                  onChange={(e) => handleLabelChange({ fieldKey: key, label: e.target.value })}
                  data-e2e={`settings-input-label-${key}`}
                  className="mt-2 w-full rounded-lg border border-border bg-surface-input px-3 py-1.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Display label"
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button primary onClick={handleSaveFields} disabled={saving} data-e2e="settings-btn-save-fields">
              {saving ? 'Saving...' : 'Save Fields'}
            </Button>
          </div>
        </div>

        {/* Sync Account */}
        <div className="rounded-xl bg-surface-card border border-border p-6">
          <h2 className="text-lg font-semibold text-fg mb-2">Sync Account</h2>
          <p className="text-sm text-fg-secondary mb-4">
            Dedicated AD account for automated synchronization.
            A strong password is generated automatically and stored encrypted — no one sees it.
          </p>

          {syncAccount.configured ? (
            <div>
              <div className="mb-4 rounded-lg bg-green-900/30 border border-green-800 px-4 py-3 text-sm text-green-300">
                Active: <strong>{syncAccount.username}</strong>
              </div>
              <Button secondary onClick={handleResetSyncPassword} disabled={resettingSync} data-e2e="settings-btn-reset-sync-password">
                {resettingSync ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">Username</label>
                <input
                  type="text"
                  value={syncUsername}
                  onChange={(e) => setSyncUsername(e.target.value)}
                  placeholder="svc-conductor"
                  data-e2e="settings-input-sync-username"
                  className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <Button primary onClick={handleCreateSync} disabled={savingSync} data-e2e="settings-btn-configure-sync">
                {savingSync ? 'Creating...' : 'Create & Configure'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
