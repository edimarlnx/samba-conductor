import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { RoutePaths } from '../general/RoutePaths';

export function ErrorFallback({ error, resetErrorBoundary }) {
  const navigate = useNavigate();

  return (
    <div role="alert" className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="max-w-md text-center">
        {Meteor.isDevelopment && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-800 p-4 text-left">
            <p className="text-sm font-medium text-red-300">DEV ONLY</p>
            <pre className="mt-2 text-xs text-red-400 overflow-auto">{error.message}</pre>
          </div>
        )}

        <p className="text-lg text-gray-300 mb-6">An error occurred. Please try again or contact support.</p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              resetErrorBoundary();
              navigate(RoutePaths.SELF_SERVICE);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={resetErrorBoundary}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
