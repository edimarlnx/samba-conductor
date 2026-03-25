import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';

export function Settings() {
  const { openAlert } = useAlert();
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const result = await Meteor.callAsync('settings.get', { key: 'selfService.editableFields' });
        setFields(result || {});
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
      [fieldKey]: {
        ...prev[fieldKey],
        enabled: !prev[fieldKey]?.enabled,
      },
    }));
  }

  function handleLabelChange({ fieldKey, label }) {
    setFields((prev) => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        label,
      },
    }));
  }

  async function handleSave() {
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

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Configure the self-service portal</p>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Self-Service Editable Fields</h2>
          <p className="text-sm text-gray-400 mb-6">
            Choose which profile fields users can edit in the self-service portal.
            Disabled fields are shown as read-only.
          </p>

          <div className="space-y-3">
            {Object.entries(fields).map(([key, config]) => (
              <div key={key} className="flex items-center gap-4 rounded-lg bg-gray-800/50 px-4 py-3">
                {/* Toggle */}
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

                {/* Field key */}
                <span className="text-xs font-mono text-gray-500 w-40">{key}</span>

                {/* Label */}
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
        </div>

        <div className="mt-6">
          <Button primary onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
