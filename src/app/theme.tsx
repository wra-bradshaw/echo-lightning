import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | undefined>(undefined);

export function ThemeProvider({ children, root }: { children: ReactNode; root?: HTMLElement }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });
  useLayoutEffect(() => {
    const target = root ?? document.documentElement;
    target.classList.toggle('dark', theme === 'dark');
    target.dataset.theme = theme;
  }, [root, theme]);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider.');
  return value;
}
