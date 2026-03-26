import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate } from 'react-router-dom';
import { useLoggedUser } from 'meteor/quave:logged-user-react';
import { RoutePaths } from '../general/RoutePaths';
import { Loading } from '../components/Loading';

export function SelfServiceHome() {
  const navigate = useNavigate();
  const { loggedUser } = useLoggedUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const result = await Meteor.callAsync('selfService.getProfile');
        setProfile(result);
      } catch (error) {
        console.error('[SelfService] Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return <Loading />;
  }

  const groups = (profile?.memberOf || []).map((dn) => {
    const match = dn.match(/^CN=([^,]+)/);
    return match ? match[1] : dn;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">My Account</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Welcome, {loggedUser?.profile?.displayName || loggedUser?.username}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
        <button
          onClick={() => navigate(RoutePaths.PROFILE)}
          className="rounded-xl bg-surface-card border border-border p-5 text-left transition-colors hover:bg-surface-hover hover:border-border"
        >
          <h3 className="text-sm font-semibold text-fg">Edit Profile</h3>
          <p className="mt-1 text-xs text-fg-secondary">Update your personal information</p>
        </button>
        <button
          onClick={() => navigate(RoutePaths.CHANGE_PASSWORD)}
          className="rounded-xl bg-surface-card border border-border p-5 text-left transition-colors hover:bg-surface-hover hover:border-border"
        >
          <h3 className="text-sm font-semibold text-fg">Change Password</h3>
          <p className="mt-1 text-xs text-fg-secondary">Update your account password</p>
        </button>
      </div>

      {/* Profile Info */}
      {profile && (
        <div className="rounded-xl bg-surface-card border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-fg mb-4">Profile</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoField label="Username" value={profile.username} />
            <InfoField label="Display Name" value={profile.displayName} />
            <InfoField label="First Name" value={profile.givenName} />
            <InfoField label="Last Name" value={profile.surname} />
            <InfoField label="Email" value={profile.email} />
            <InfoField label="Phone" value={profile.telephoneNumber} />
            <InfoField label="Company" value={profile.company} />
            <InfoField label="Department" value={profile.department} />
            <InfoField label="Status" value={profile.enabled ? 'Active' : 'Disabled'} />
          </dl>
        </div>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <div className="rounded-xl bg-surface-card border border-border p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">Groups</h2>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <span
                key={group}
                className="rounded-full bg-surface-input px-3 py-1 text-xs font-medium text-fg-secondary"
              >
                {group}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Admin link */}
      {loggedUser?.profile?.isAdmin && (
        <div className="mt-6">
          <button
            onClick={() => navigate(RoutePaths.ADMIN_DASHBOARD)}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Go to Admin Panel &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs font-medium text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg-secondary">{value}</dd>
    </div>
  );
}
