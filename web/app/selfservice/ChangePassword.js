import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate } from 'react-router-dom';
import { useLoggedUser } from 'meteor/quave:logged-user-react';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { RoutePaths } from '../general/RoutePaths';
import { Button } from '../components/Button';

export function ChangePassword() {
  const navigate = useNavigate();
  const { loggedUser } = useLoggedUser();
  const { openAlert } = useAlert();
  const mustChange = loggedUser?.profile?.mustChangePassword;

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange({ field, value }) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      openAlert('New passwords do not match');
      return;
    }

    if (form.newPassword.length < 8) {
      openAlert('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);

    try {
      await Meteor.callAsync('selfService.changePassword', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      openAlert('Password changed successfully');
      navigate(RoutePaths.SELF_SERVICE);
    } catch (error) {
      openAlert(error.reason || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Change Password</h1>
        {mustChange ? (
          <div className="mt-2 rounded-lg bg-yellow-900/30 border border-yellow-800 px-4 py-3 text-sm text-yellow-300">
            Your password has expired. You must set a new password to continue.
          </div>
        ) : (
          <p className="mt-1 text-sm text-fg-secondary">Update your account password</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="rounded-xl bg-surface-card border border-border p-5 space-y-4">
          {!mustChange && (
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => handleChange({ field: 'currentPassword', value: e.target.value })}
                required
                data-e2e="change-password-input-current"
                className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">
              New Password
            </label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => handleChange({ field: 'newPassword', value: e.target.value })}
              required
              data-e2e="change-password-input-new"
              className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-fg-secondary mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange({ field: 'confirmPassword', value: e.target.value })}
              required
              data-e2e="change-password-input-confirm"
              className="w-full rounded-lg border border-border bg-surface-input px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button primary type="submit" disabled={submitting} data-e2e="change-password-btn-submit">
            {submitting ? 'Changing...' : 'Change Password'}
          </Button>
          {!mustChange && (
            <Button secondary onClick={() => navigate(RoutePaths.SELF_SERVICE)} type="button" data-e2e="change-password-btn-cancel">
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
