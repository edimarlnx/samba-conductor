import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { useLoggedUser } from 'meteor/quave:logged-user-react';
import { RoutePaths } from '../general/RoutePaths';

export function SelfServiceLayout({ children }) {
  const { loggedUser } = useLoggedUser();
  const navigate = useNavigate();

  function handleLogout() {
    Meteor.callAsync('auth.logout').catch(() => {});
    Meteor.logout(() => {
      navigate(RoutePaths.LOGIN);
    });
  }

  const displayName = loggedUser?.profile?.displayName || loggedUser?.username || '';
  const mustChangePassword = loggedUser?.profile?.mustChangePassword;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-bold text-white">Samba Conductor</h1>

            {/* Navigation - hidden when must change password */}
            {!mustChangePassword && (
              <nav className="flex gap-1">
                <NavLink
                  to={RoutePaths.SELF_SERVICE}
                  end
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  My Account
                </NavLink>
                <NavLink
                  to={RoutePaths.PROFILE}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  Edit Profile
                </NavLink>
                <NavLink
                  to={RoutePaths.CHANGE_PASSWORD}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  Change Password
                </NavLink>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{displayName}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
