import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate } from 'react-router-dom';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { RoutePaths } from '../general/RoutePaths';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';

export function Profile() {
  const navigate = useNavigate();
  const { openAlert } = useAlert();
  const [fields, setFields] = useState({});
  const [editableConfig, setEditableConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profile, config] = await Promise.all([
          Meteor.callAsync('selfService.getProfile'),
          Meteor.callAsync('settings.get', { key: 'selfService.editableFields' }),
        ]);

        setEditableConfig(config || {});
        setFields({
          givenName: profile.givenName || '',
          surname: profile.surname || '',
          mail: profile.email || '',
          telephoneNumber: profile.telephoneNumber || '',
          description: profile.description || '',
          company: profile.company || '',
          department: profile.department || '',
          physicalDeliveryOffice: profile.physicalDeliveryOffice || '',
        });
      } catch (error) {
        openAlert(error.reason || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function handleChange({ field, value }) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      // Only send editable fields
      const editableFields = {};
      Object.entries(fields).forEach(([key, value]) => {
        if (editableConfig[key]?.enabled) {
          editableFields[key] = value;
        }
      });

      await Meteor.callAsync('selfService.updateProfile', { fields: editableFields });
      openAlert('Profile updated successfully');
      navigate(RoutePaths.SELF_SERVICE);
    } catch (error) {
      openAlert(error.reason || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  // Build field list from config
  const fieldList = Object.entries(editableConfig)
    .filter(([, config]) => config.label)
    .map(([key, config]) => ({
      key,
      label: config.label,
      enabled: config.enabled,
    }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Edit Profile</h1>
        <p className="mt-1 text-sm text-fg-secondary">Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="rounded-xl bg-surface-card border border-border p-5 space-y-4">
          {fieldList.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                {field.label}
              </label>
              <input
                type="text"
                value={fields[field.key] || ''}
                onChange={(e) => handleChange({ field: field.key, value: e.target.value })}
                disabled={!field.enabled}
                className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {!field.enabled && (
                <p className="mt-0.5 text-xs text-fg-muted">This field cannot be edited</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <Button primary type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button secondary onClick={() => navigate(RoutePaths.SELF_SERVICE)} type="button">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
