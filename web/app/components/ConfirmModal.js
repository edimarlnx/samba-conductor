import React from 'react';
import { Button } from './Button';

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false, 'data-e2e': dataE2e = 'confirm-modal' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl bg-surface-card border border-border p-6 shadow-2xl" data-e2e={`${dataE2e}-modal`}>
        <h3 className="text-lg font-semibold text-fg">{title}</h3>
        <p className="mt-2 text-sm text-fg-secondary">{message}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button secondary onClick={onCancel} data-e2e={`${dataE2e}-btn-cancel`}>
            Cancel
          </Button>
          <Button danger={danger} primary={!danger} onClick={onConfirm} data-e2e={`${dataE2e}-btn-confirm`}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
