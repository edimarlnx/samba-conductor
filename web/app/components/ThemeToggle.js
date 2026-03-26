import React, { useState, useEffect } from 'react';

const THEMES = [
  { id: 'wine', label: 'Wine' },
  { id: 'classic', label: 'Classic' },
  { id: 'light', label: 'Light' },
];

function getInitialTheme() {
  if (typeof window === 'undefined') return 'wine';
  return localStorage.getItem('theme') || 'wine';
}

function applyTheme({ theme }) {
  const html = document.documentElement;
  html.classList.remove('light', 'classic', 'wine');
  html.classList.add(theme);
}

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTheme({ theme });
  }, [theme]);

  function handleSelect({ themeId }) {
    setTheme(themeId);
    localStorage.setItem('theme', themeId);
    setOpen(false);
  }

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`rounded-lg p-2 transition-colors text-fg-muted hover:bg-surface-hover hover:text-fg ${className}`}
        title={`Theme: ${current.label}`}
      >
        <ThemeIcon />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-border bg-surface-card py-1 shadow-xl">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect({ themeId: t.id })}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  theme === t.id
                    ? 'text-accent font-medium'
                    : 'text-fg-secondary hover:text-fg hover:bg-surface-hover'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-border"
                  style={{ backgroundColor: getThemePreviewColor({ themeId: t.id }) }}
                />
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getThemePreviewColor({ themeId }) {
  const colors = {
    wine: '#2d1520',
    classic: '#111827',
    light: '#faf5f7',
  };
  return colors[themeId] || colors.wine;
}

function ThemeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
    </svg>
  );
}
