import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { useLoggedUser } from 'meteor/quave:logged-user-react';
import { RoutePaths } from '../general/RoutePaths';
import { ThemeToggle } from '../components/ThemeToggle';

export function SelfServiceLayout({ children }) {
  const { loggedUser } = useLoggedUser();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    Meteor.callAsync('auth.logout').catch(() => {});
    Meteor.logout(() => {
      navigate(RoutePaths.LOGIN);
    });
  }

  const displayName = loggedUser?.profile?.displayName || loggedUser?.username || '';
  const mustChangePassword = loggedUser?.profile?.mustChangePassword;

  const navItems = [
    { to: RoutePaths.SELF_SERVICE, label: 'My Account', end: true },
    { to: RoutePaths.PROFILE, label: 'Edit Profile' },
    { to: RoutePaths.CHANGE_PASSWORD, label: 'Change Password' },
  ];

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-surface-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold text-fg">Samba Conductor</h1>

            {/* Desktop nav */}
            {!mustChangePassword && (
              <nav className="hidden sm:flex gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    data-e2e={`selfservice-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-accent text-white'
                          : 'text-fg-secondary hover:bg-surface-hover hover:text-fg'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-fg-secondary">{displayName}</span>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              data-e2e="selfservice-btn-logout"
              className="rounded-lg px-3 py-2 text-sm text-fg-secondary hover:bg-surface-hover hover:text-fg transition-colors"
            >
              Sign out
            </button>

            {/* Mobile hamburger */}
            {!mustChangePassword && (
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                data-e2e="selfservice-btn-hamburger"
                className="rounded-lg p-2 text-fg-muted hover:bg-surface-hover sm:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {menuOpen && !mustChangePassword && (
          <div className="border-t border-border px-4 py-2 sm:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  data-e2e={`selfservice-mobile-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-fg-secondary hover:bg-surface-hover hover:text-fg'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
