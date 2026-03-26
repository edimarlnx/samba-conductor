import React, { useEffect } from 'react';

export function MyAlert({ message, isOpen, clear, autoCloseIn = 3_000 }) {
  useEffect(() => {
    if (autoCloseIn && isOpen) {
      const timer = setTimeout(() => {
        clear();
      }, autoCloseIn);

      return () => clearTimeout(timer);
    }
    return () => {};
  }, [isOpen, clear]);

  if (!message || !isOpen) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-lg bg-surface-card border border-border p-3 sm:p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-fg-secondary">{message}</p>
          <button
            onClick={clear}
            aria-label="Clear message"
            className="focus:outline-hidden ml-2 shrink-0 text-fg-muted hover:text-fg"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
