import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from '../general/RoutePaths';
import { Button } from '../components/Button';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    Accounts.callLoginMethod({
      methodArguments: [{ sambaUsername: username, sambaPassword: password }],
      userCallback(err) {
        setLoading(false);
        if (err) {
          setError(err.reason || 'Authentication failed');
          return;
        }

        // Redirect based on user profile
        const user = Meteor.user();
        if (user?.profile?.mustChangePassword) {
          navigate(RoutePaths.CHANGE_PASSWORD);
        } else if (user?.profile?.isAdmin) {
          navigate(RoutePaths.ADMIN_DASHBOARD);
        } else {
          navigate(RoutePaths.SELF_SERVICE);
        }
      },
    });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-surface-card p-8 shadow-2xl border border-border">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-fg">Samba Conductor</h1>
            <p className="mt-2 text-sm text-fg-secondary">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-fg-secondary mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-surface-input px-4 py-2.5 text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-fg-secondary mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface-input px-4 py-2.5 text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-900/50 border border-red-800 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <Button primary type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-fg-muted">
          Samba 4 Active Directory Domain Controller
        </p>
      </div>
    </div>
  );
}
