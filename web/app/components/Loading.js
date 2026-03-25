import React from 'react';

export function Loading() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
    </div>
  );
}
