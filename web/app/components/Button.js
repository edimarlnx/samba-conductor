import React from 'react';

const buttonStyles = {
  primary: {
    bg: 'bg-accent',
    hover: 'hover:bg-accent-hover',
    text: 'text-white',
    border: 'border-transparent',
  },
  secondary: {
    bg: 'bg-surface-input',
    hover: 'hover:bg-surface-hover',
    text: 'text-fg-secondary',
    border: 'border-border',
  },
  tertiary: {
    bg: 'bg-transparent',
    hover: 'hover:bg-surface-hover',
    text: 'text-fg-muted',
    border: 'border-transparent',
  },
  danger: {
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    text: 'text-white',
    border: 'border-transparent',
  },
};

export function Button({
  primary = false,
  secondary = false,
  tertiary = false,
  danger = false,
  className = '',
  children,
  'data-e2e': dataE2e,
  ...rest
}) {
  function getButtonStyle() {
    if (danger) return buttonStyles.danger;
    if (primary) return buttonStyles.primary;
    if (secondary) return buttonStyles.secondary;
    if (tertiary) return buttonStyles.tertiary;
    return buttonStyles.primary;
  }

  const style = getButtonStyle();

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg border ${style.border} ${style.bg} ${style.hover} ${style.text} min-h-[44px] px-4 py-3 text-sm font-medium sm:min-h-0 sm:py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      data-e2e={dataE2e}
      {...rest}
    >
      {children}
    </button>
  );
}
