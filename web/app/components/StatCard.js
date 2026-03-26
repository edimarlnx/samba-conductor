import React from 'react';

export function StatCard({ title, value, icon, description }) {
  return (
    <div className="rounded-xl bg-surface-card border border-border p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-fg-muted">{title}</p>
          <p className="mt-2 text-2xl md:text-3xl font-bold text-fg">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-fg-muted">{description}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-surface-input p-3 text-fg-muted">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
