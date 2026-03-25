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
    <div className="fixed right-4 top-4 z-50">
      <div className="max-w-sm rounded-lg bg-gray-800 border border-gray-700 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-gray-200">{message}</p>
          <button
            onClick={clear}
            aria-label="Clear message"
            className="focus:outline-hidden ml-4 text-gray-400 hover:text-gray-200"
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
