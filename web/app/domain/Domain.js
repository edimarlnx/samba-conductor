import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { Loading } from '../components/Loading';

export function Domain() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDomainInfo() {
      try {
        const result = await Meteor.callAsync('domain.getInfo');
        setInfo(result);
      } catch (error) {
        console.error('[Domain] Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDomainInfo();
  }, []);

  if (loading) {
    return <Loading />;
  }

  if (!info) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-fg mb-4">Domain</h1>
        <p className="text-fg-secondary">Unable to retrieve domain information.</p>
      </div>
    );
  }

  const sections = [
    {
      title: 'Domain',
      fields: [
        { label: 'Realm', value: info.realm },
        { label: 'Base DN', value: info.baseDn },
        { label: 'Forest', value: info.forest },
        { label: 'NetBIOS Domain', value: info.netbios },
        { label: 'Domain Controller', value: info.dc_name },
        { label: 'LDAP Server', value: info.ldap_server_name },
        { label: 'Server Site', value: info.server_site },
        { label: 'Client Site', value: info.client_site },
      ],
    },
    {
      title: 'Functional Levels',
      fields: [
        { label: 'Domain Level', value: info.levels?.domain_function_level },
        { label: 'Forest Level', value: info.levels?.forest_function_level },
        { label: 'Lowest DC Level', value: info.levels?.lowest_level_dc },
      ],
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Domain</h1>
        <p className="mt-1 text-sm text-fg-secondary">Active Directory domain configuration and status</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl bg-surface-card border border-border p-6" data-e2e={section.title === 'Domain' ? 'domain-section-info' : section.title === 'Functional Levels' ? 'domain-section-levels' : undefined}>
            <h2 className="text-lg font-semibold text-fg mb-4">{section.title}</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.fields
                .filter((field) => field.value)
                .map((field) => (
                  <div key={field.label}>
                    <dt className="text-xs font-medium text-fg-muted">{field.label}</dt>
                    <dd className="mt-0.5 text-sm text-fg-secondary">{field.value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>

      {info.error && (
        <div className="mt-6 rounded-xl bg-red-900/30 border border-red-800 p-4">
          <p className="text-sm text-red-400">
            Some information could not be retrieved: {info.error}
          </p>
        </div>
      )}
    </div>
  );
}
