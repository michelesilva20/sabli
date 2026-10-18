import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemePreference } from '@/shared/types/domain';

const STORAGE_KEY = 'sabli-theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function applyPreference(preference: ThemePreference) {
  const resolved = preference === 'system' ? systemTheme() : preference;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.dataset.theme = preference;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreference());
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    applyPreference(readPreference()),
  );

  useEffect(() => {
    const next = applyPreference(preference);
    setResolved(next);
    localStorage.setItem(STORAGE_KEY, preference);
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(applyPreference('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference: setPreferenceState,
    }),
    [preference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme precisa estar dentro de ThemeProvider.');
  return context;
}
