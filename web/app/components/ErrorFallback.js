import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { RoutePaths } from '../general/RoutePaths';

export function ErrorFallback({ error, resetErrorBoundary }) {
  const navigate = useNavigate();

  return (
    <div role="alert" className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        {Meteor.isDevelopment && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-800 p-4 text-left">
            <p className="text-sm font-medium text-red-300">DEV ONLY</p>
            <pre className="mt-2 text-xs text-red-400 max-h-48 overflow-auto">{error.message}</pre>
          </div>
        )}

        <p className="text-lg text-fg-secondary mb-6">An error occurred. Please try again or contact support.</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => {
              resetErrorBoundary();
              navigate(RoutePaths.SELF_SERVICE);
            }}
            className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover transition-colors sm:py-2"
          >
            Go Home
          </button>
          <button
            onClick={resetErrorBoundary}
            className="rounded-lg bg-surface-input px-4 py-3 text-sm font-medium text-fg-secondary hover:bg-surface-hover transition-colors sm:py-2"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
