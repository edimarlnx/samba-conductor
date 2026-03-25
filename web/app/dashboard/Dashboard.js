import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from '../general/RoutePaths';
import { StatCard } from '../components/StatCard';
import { Loading } from '../components/Loading';

export function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const result = await Meteor.callAsync('dashboard.getSummary');
        setSummary(result);
      } catch (error) {
        console.error('[Dashboard] Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) {
    return <Loading />;
  }

  const quickActions = [
    { label: 'Manage Users', path: RoutePaths.USERS, description: 'Create, edit and manage AD users' },
    { label: 'Manage Groups', path: RoutePaths.GROUPS, description: 'Create, edit and manage AD groups' },
    { label: 'Domain Info', path: RoutePaths.DOMAIN, description: 'View domain configuration and status' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          {summary?.domain?.realm || 'Active Directory overview'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Users"
          value={summary?.usersCount ?? '-'}
          icon={<UsersStatIcon />}
        />
        <StatCard
          title="Active Users"
          value={summary?.enabledUsersCount ?? '-'}
          icon={<ActiveIcon />}
          description="Enabled accounts"
        />
        <StatCard
          title="Disabled Users"
          value={summary?.disabledUsersCount ?? '-'}
          icon={<DisabledIcon />}
          description="Disabled accounts"
        />
        <StatCard
          title="Groups"
          value={summary?.groupsCount ?? '-'}
          icon={<GroupsStatIcon />}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="rounded-xl bg-gray-900 border border-gray-800 p-5 text-left transition-colors hover:bg-gray-800 hover:border-gray-700"
            >
              <h3 className="text-sm font-semibold text-white">{action.label}</h3>
              <p className="mt-1 text-xs text-gray-400">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Domain Info */}
      {summary?.domain && !summary.domain.error && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Domain Information</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DomainField label="Realm" value={summary.domain.realm} />
            <DomainField label="Base DN" value={summary.domain.baseDn} />
            {summary.domain.forest && <DomainField label="Forest" value={summary.domain.forest} />}
            {summary.domain.netbios && <DomainField label="NetBIOS" value={summary.domain.netbios} />}
            {summary.domain.dc_name && <DomainField label="DC" value={summary.domain.dc_name} />}
          </dl>
        </div>
      )}
    </div>
  );
}

function DomainField({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-300">{value}</dd>
    </div>
  );
}

function UsersStatIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DisabledIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function GroupsStatIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}
