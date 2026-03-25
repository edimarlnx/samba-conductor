import React from 'react';

const buttonStyles = {
  primary: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    text: 'text-white',
    border: 'border-transparent',
  },
  secondary: {
    bg: 'bg-gray-800',
    hover: 'hover:bg-gray-700',
    text: 'text-gray-200',
    border: 'border-gray-600',
  },
  tertiary: {
    bg: 'bg-transparent',
    hover: 'hover:bg-gray-800',
    text: 'text-gray-400',
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
      className={`inline-flex items-center justify-center rounded-lg border ${style.border} ${style.bg} ${style.hover} ${style.text} px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
