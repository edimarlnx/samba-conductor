import React, { useState } from 'react';

export function DataTable({ columns, data, onRowClick, searchPlaceholder = 'Search...', 'data-e2e': dataE2e = 'table' }) {
  const [search, setSearch] = useState('');

  const filteredData = data.filter((row) =>
    columns.some((col) => {
      const value = col.accessor ? row[col.accessor] : '';
      return String(value).toLowerCase().includes(search.toLowerCase());
    })
  );

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          data-e2e={`${dataE2e}-search`}
          className="w-full sm:max-w-sm rounded-lg border border-border bg-surface-input px-4 py-2.5 text-sm text-fg placeholder-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-card">
              {columns.map((col) => (
                <th
                  key={col.accessor || col.header}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-fg-muted"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-fg-muted"
                >
                  No results found
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr
                  key={row.id || row.username || row.name || index}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`bg-surface-card/50 transition-colors hover:bg-surface-hover ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.accessor || col.header}
                      className="whitespace-nowrap px-4 py-3 text-sm text-fg-secondary"
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {filteredData.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-card p-6 text-center text-sm text-fg-muted">
            No results found
          </div>
        ) : (
          filteredData.map((row, index) => (
            <div
              key={row.id || row.username || row.name || index}
              onClick={() => onRowClick && onRowClick(row)}
              className={`rounded-xl border border-border bg-surface-card p-4 space-y-2 ${
                onRowClick ? 'cursor-pointer active:bg-surface-hover' : ''
              }`}
            >
              {columns.map((col) => {
                const value = col.render ? col.render(row) : row[col.accessor];
                if (!value && value !== 0) return null;

                return (
                  <div key={col.accessor || col.header} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-fg-muted">{col.header}</span>
                    <span className="text-sm text-fg-secondary text-right">{value}</span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Count */}
      <p className="mt-2 text-xs text-fg-muted">
        {filteredData.length} of {data.length} items
      </p>
    </div>
  );
}
