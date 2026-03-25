import React from 'react';

export function StatCard({ title, value, icon, description }) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-gray-800 p-3 text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
