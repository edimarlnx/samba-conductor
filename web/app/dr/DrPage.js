import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { Loading } from '../components/Loading';

export function DrPage() {
  const { openAlert } = useAlert();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      const result = await Meteor.callAsync('dr.getStatus');
      setStatus(result);
    } catch (error) {
      openAlert(error.reason || 'Failed to load DR status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Disaster Recovery</h1>
        <p className="mt-1 text-sm text-gray-400">Backup, sync, and restore Active Directory data</p>
      </div>

      <div className="max-w-3xl space-y-8">
        <DrKeySection status={status} onUpdate={fetchStatus} openAlert={openAlert} />
        <SyncSection status={status} onUpdate={fetchStatus} openAlert={openAlert} />
        <BackupS3Section status={status} onUpdate={fetchStatus} openAlert={openAlert} />
        <RestoreSection status={status} openAlert={openAlert} />
      </div>
    </div>
  );
}

// DR Key configuration section
function DrKeySection({ status, onUpdate, openAlert }) {
  const { configured, unlocked } = status?.drKey || {};
  const [mode, setMode] = useState(null); // 'provide' | 'generate'
  const [key, setKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleGenerate() {
    try {
      const newKey = await Meteor.callAsync('dr.generateKey');
      setGeneratedKey(newKey);
      setMode('generate');
    } catch (error) {
      openAlert(error.reason || 'Failed to generate key');
    }
  }

  async function handleConfigure({ keyToUse }) {
    setSubmitting(true);
    try {
      await Meteor.callAsync('dr.configureKey', { key: keyToUse });
      openAlert('DR Key configured successfully');
      setMode(null);
      setKey('');
      setGeneratedKey('');
      setSavedConfirm(false);
      await onUpdate();
    } catch (error) {
      openAlert(error.reason || 'Failed to configure DR Key');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlock() {
    setSubmitting(true);
    try {
      await Meteor.callAsync('dr.unlockKey', { key });
      openAlert('DR Key unlocked');
      setKey('');
      await onUpdate();
    } catch (error) {
      openAlert(error.reason || 'Invalid DR Key');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyKey() {
    navigator.clipboard.writeText(generatedKey);
    openAlert('Key copied to clipboard');
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-2">DR Encryption Key</h2>

      {/* Status badge */}
      {configured && unlocked && (
        <div className="mb-4 rounded-lg bg-green-900/30 border border-green-800 px-4 py-3 text-sm text-green-300">
          DR Key is active. All backup data is encrypted.
        </div>
      )}

      {configured && !unlocked && (
        <div className="mb-4 rounded-lg bg-yellow-900/30 border border-yellow-800 px-4 py-3 text-sm text-yellow-300">
          DR Key is configured but locked. Enter your key to unlock.
        </div>
      )}

      {!configured && !mode && (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            The DR key encrypts all backup data stored in MongoDB (password hashes, sync account credentials).
            Without this key, backup data <strong className="text-gray-200">cannot be recovered</strong>.
          </p>

          <div className="flex gap-3">
            <Button secondary onClick={() => setMode('provide')}>I have a key</Button>
            <Button primary onClick={handleGenerate}>Generate a key</Button>
          </div>
        </div>
      )}

      {/* Provide existing key */}
      {mode === 'provide' && !configured && (
        <div className="space-y-3 mt-4">
          <p className="text-sm text-gray-400">Enter your DR key (hex string, at least 32 characters):</p>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your DR key..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <Button primary onClick={() => handleConfigure({ keyToUse: key })} disabled={submitting || key.length < 16}>
              {submitting ? 'Configuring...' : 'Configure'}
            </Button>
            <Button secondary onClick={() => { setMode(null); setKey(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Generated key — show once */}
      {mode === 'generate' && !configured && generatedKey && (
        <div className="space-y-4 mt-4">
          <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3">
            <p className="text-sm font-semibold text-red-300 mb-2">Save this key now!</p>
            <p className="text-xs text-red-400">
              This key will NOT be shown again and cannot be recovered.
              Store it in a password manager, printed copy in a safe, or other secure location.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-sm font-mono text-green-400 break-all select-all">
              {generatedKey}
            </code>
            <Button secondary onClick={handleCopyKey}>Copy</Button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={savedConfirm}
              onChange={(e) => setSavedConfirm(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
            />
            I have saved this key in a secure location
          </label>

          <div className="flex gap-3">
            <Button
              primary
              onClick={() => handleConfigure({ keyToUse: generatedKey })}
              disabled={submitting || !savedConfirm}
            >
              {submitting ? 'Configuring...' : 'Configure'}
            </Button>
            <Button secondary onClick={() => { setMode(null); setGeneratedKey(''); setSavedConfirm(false); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Unlock (after restart) */}
      {configured && !unlocked && (
        <div className="space-y-3 mt-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your DR key to unlock..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Button primary onClick={handleUnlock} disabled={submitting || !key}>
            {submitting ? 'Unlocking...' : 'Unlock'}
          </Button>
          <p className="text-xs text-gray-500">
            Tip: Set the <code>DR_KEY</code> environment variable to auto-unlock on startup.
          </p>
        </div>
      )}
    </div>
  );
}

// Sync status and manual trigger section
function SyncSection({ status, onUpdate, openAlert }) {
  const [syncing, setSyncing] = useState(false);
  const [syncingHashes, setSyncingHashes] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const results = await Meteor.callAsync('dr.triggerSync');
      openAlert(`Sync complete: ${results.users?.count || 0} users, ${results.groups?.count || 0} groups`);
      await onUpdate();
    } catch (error) {
      openAlert(error.reason || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleHashSync() {
    setSyncingHashes(true);
    try {
      const result = await Meteor.callAsync('dr.triggerHashSync');
      openAlert(`Hash sync complete: ${result.count} users`);
      await onUpdate();
    } catch (error) {
      openAlert(error.reason || 'Hash sync failed');
    } finally {
      setSyncingHashes(false);
    }
  }

  function formatDate(date) {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Sync Status</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
        <SyncItem label="Users" count={status?.counts?.users} lastSync={status?.lastSync?.users} formatDate={formatDate} />
        <SyncItem label="Groups" count={status?.counts?.groups} lastSync={status?.lastSync?.groups} formatDate={formatDate} />
        <SyncItem label="Domain" lastSync={status?.lastSync?.domain} formatDate={formatDate} />
        <SyncItem label="Password Hashes" count={status?.counts?.hashes} lastSync={status?.lastSync?.hashes} formatDate={formatDate} />
      </div>

      <div className="flex gap-3">
        <Button primary onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Metadata Now'}
        </Button>
        <Button
          secondary
          onClick={handleHashSync}
          disabled={syncingHashes || !status?.drKey?.unlocked}
          title={!status?.drKey?.unlocked ? 'DR Key must be unlocked' : ''}
        >
          {syncingHashes ? 'Syncing...' : 'Sync Hashes Now'}
        </Button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Metadata syncs automatically every 15 minutes. Hashes sync every 6 hours (requires DR Key unlocked).
      </p>
    </div>
  );
}

function SyncItem({ label, count, lastSync, formatDate }) {
  return (
    <div className="rounded-lg bg-gray-800/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        {count !== undefined && <span className="text-sm text-gray-500">{count} items</span>}
      </div>
      <p className="text-xs text-gray-500 mt-1">Last sync: {formatDate(lastSync)}</p>
    </div>
  );
}

// Restore section
// S3 Backup configuration and manual trigger
function BackupS3Section({ status, onUpdate, openAlert }) {
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [form, setForm] = useState({
    endpoint: '',
    bucket: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    prefix: 'samba-conductor/',
    includeMongoDump: true,
    includeSambaBackup: true,
    retentionDays: 30,
    scheduleHours: 6,
    enabled: false,
  });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const result = await Meteor.callAsync('dr.getS3Config');
        setConfig(result);
        if (result) {
          setForm((prev) => ({ ...prev, ...result, secretAccessKey: '' }));
        }
      } catch (error) {
        // Config may not exist yet
      } finally {
        setLoadingConfig(false);
      }
    }
    fetchConfig();
  }, []);

  function handleChange({ field, value }) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.bucket || !form.accessKeyId || !form.secretAccessKey) {
      openAlert('Bucket, Access Key and Secret Key are required');
      return;
    }
    setSaving(true);
    try {
      await Meteor.callAsync('dr.configureS3', form);
      openAlert('S3 backup configured and connection tested successfully');
      await onUpdate();
    } catch (error) {
      openAlert(error.reason || 'Failed to configure S3. Check credentials and endpoint.');
    } finally {
      setSaving(false);
    }
  }

  async function handleBackupNow() {
    setBackingUp(true);
    try {
      const result = await Meteor.callAsync('dr.triggerBackup', {
        includeMongo: form.includeMongoDump,
        includeSamba: form.includeSambaBackup,
      });
      const uploaded = result.uploads?.length || 0;
      const errors = result.errors?.length || 0;
      openAlert(`Backup complete: ${uploaded} files uploaded${errors ? `, ${errors} errors` : ''}`);
      await onUpdate();
    } catch (error) {
      openAlert(error.reason || 'Backup failed');
    } finally {
      setBackingUp(false);
    }
  }

  if (loadingConfig) return null;

  const lastRun = status?.backup?.lastRun;

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-2">S3 Backup</h2>
      <p className="text-sm text-gray-400 mb-4">
        Upload MongoDB dumps and Samba domain backups to S3-compatible storage.
      </p>

      {lastRun && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
          lastRun.errors > 0
            ? 'bg-yellow-900/30 border border-yellow-800 text-yellow-300'
            : 'bg-green-900/30 border border-green-800 text-green-300'
        }`}>
          Last backup: {new Date(lastRun.timestamp).toLocaleString()} — {lastRun.uploads} files
          {lastRun.errors > 0 && `, ${lastRun.errors} errors`}
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">S3 Endpoint (blank for AWS)</label>
            <input
              type="text"
              value={form.endpoint}
              onChange={(e) => handleChange({ field: 'endpoint', value: e.target.value })}
              placeholder="https://s3.example.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Bucket</label>
            <input
              type="text"
              value={form.bucket}
              onChange={(e) => handleChange({ field: 'bucket', value: e.target.value })}
              placeholder="my-backups"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Access Key ID</label>
            <input
              type="text"
              value={form.accessKeyId}
              onChange={(e) => handleChange({ field: 'accessKeyId', value: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Secret Access Key</label>
            <input
              type="password"
              value={form.secretAccessKey}
              onChange={(e) => handleChange({ field: 'secretAccessKey', value: e.target.value })}
              placeholder={config?.configured ? '(unchanged)' : ''}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Region</label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => handleChange({ field: 'region', value: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Prefix</label>
            <input
              type="text"
              value={form.prefix}
              onChange={(e) => handleChange({ field: 'prefix', value: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Retention (days)</label>
            <input
              type="number"
              value={form.retentionDays}
              onChange={(e) => handleChange({ field: 'retentionDays', value: parseInt(e.target.value, 10) || 30 })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Schedule (every N hours)</label>
            <input
              type="number"
              value={form.scheduleHours}
              onChange={(e) => handleChange({ field: 'scheduleHours', value: parseInt(e.target.value, 10) || 6 })}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.includeMongoDump}
              onChange={(e) => handleChange({ field: 'includeMongoDump', value: e.target.checked })}
              className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
            />
            Include MongoDB dump
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.includeSambaBackup}
              onChange={(e) => handleChange({ field: 'includeSambaBackup', value: e.target.checked })}
              className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
            />
            Include Samba domain backup
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => handleChange({ field: 'enabled', value: e.target.checked })}
              className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
            />
            Enable scheduled backups
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button primary onClick={handleSave} disabled={saving}>
            {saving ? 'Testing & Saving...' : 'Test & Save'}
          </Button>
          {config?.configured && (
            <Button secondary onClick={handleBackupNow} disabled={backingUp || !status?.drKey?.unlocked}>
              {backingUp ? 'Backing up...' : 'Backup Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RestoreSection({ status, openAlert }) {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [results, setResults] = useState(null);

  async function handleLoadPreview() {
    setLoadingPreview(true);
    try {
      const result = await Meteor.callAsync('dr.getRestorePreview');
      setPreview(result);
    } catch (error) {
      openAlert(error.reason || 'Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setConfirmRestore(false);

    try {
      const usersResult = await Meteor.callAsync('dr.restoreUsers', {
        includeHashes: status?.drKey?.unlocked && preview?.hashes?.available,
      });
      const groupsResult = await Meteor.callAsync('dr.restoreGroups');

      setResults({ users: usersResult, groups: groupsResult });
      openAlert('Restore completed');
    } catch (error) {
      openAlert(error.reason || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }

  function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-2">Restore from Snapshot</h2>
      <p className="text-sm text-gray-400 mb-4">
        Recreate AD users and groups from the latest MongoDB snapshot.
        Use this after provisioning a new empty domain.
      </p>

      {!preview && (
        <Button secondary onClick={handleLoadPreview} disabled={loadingPreview}>
          {loadingPreview ? 'Loading...' : 'Load Restore Preview'}
        </Button>
      )}

      {preview && (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
            <div className="rounded-lg bg-gray-800/50 px-4 py-3">
              <p className="text-sm font-medium text-gray-300">Users</p>
              <p className="text-2xl font-bold text-white">{preview.users.count}</p>
              <p className="text-xs text-gray-500">{formatDate(preview.users.snapshotAt)}</p>
            </div>
            <div className="rounded-lg bg-gray-800/50 px-4 py-3">
              <p className="text-sm font-medium text-gray-300">Groups</p>
              <p className="text-2xl font-bold text-white">{preview.groups.count}</p>
              <p className="text-xs text-gray-500">{formatDate(preview.groups.snapshotAt)}</p>
            </div>
            <div className="rounded-lg bg-gray-800/50 px-4 py-3">
              <p className="text-sm font-medium text-gray-300">Password Hashes</p>
              <p className="text-2xl font-bold text-white">{preview.hashes.count}</p>
              <p className="text-xs text-gray-500">
                {preview.hashes.available ? 'Available' : 'Not available'}
              </p>
            </div>
          </div>

          <Button danger onClick={() => setConfirmRestore(true)} disabled={restoring || preview.users.count === 0}>
            {restoring ? 'Restoring...' : 'Start Restore'}
          </Button>
        </div>
      )}

      {results && (
        <div className="mt-4 rounded-lg bg-gray-800/50 px-4 py-3 text-sm">
          <p className="font-medium text-white mb-2">Restore Results</p>
          <p className="text-gray-400">
            Users: {results.users.created} created, {results.users.skipped} skipped, {results.users.failed} failed
          </p>
          <p className="text-gray-400">
            Groups: {results.groups.created} created, {results.groups.skipped} skipped, {results.groups.membershipsRestored} memberships
          </p>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmRestore}
        title="Confirm Restore"
        message="This will recreate users and groups in Active Directory from the stored snapshot. Existing accounts with the same name will be skipped. Continue?"
        confirmLabel="Restore"
        danger
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore(false)}
      />
    </div>
  );
}
