import React, { useState } from 'react';

export function DataTable({ columns, data, onRowClick, searchPlaceholder = 'Search...' }) {
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
          className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900">
              {columns.map((col) => (
                <th
                  key={col.accessor || col.header}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No results found
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr
                  key={row.id || row.username || row.name || index}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`bg-gray-900/50 transition-colors hover:bg-gray-800 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.accessor || col.header}
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-300"
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

      {/* Count */}
      <p className="mt-2 text-xs text-gray-500">
        {filteredData.length} of {data.length} items
      </p>
    </div>
  );
}
