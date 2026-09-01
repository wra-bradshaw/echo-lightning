import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../shared/ui/button';
import { createLightningSettingsStore, type SettingsStorage } from '../features/settings';
import { ThemeProvider, useTheme } from './theme';

function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme('dark')}>{theme}</button>;
}

describe('theme and shared UI', () => {
  it('applies a root theme class and renders shadcn primitives', async () => {
    const root = document.createElement('div');
    render(
      <ThemeProvider root={root}>
        <ThemeProbe />
        <Button>Continue</Button>
      </ThemeProvider>,
    );
    expect(root.dataset.theme).toBe('light');
    screen.getByRole('button', { name: 'Continue' });
    screen.getByRole('button', { name: 'light' }).click();
    await waitFor(() => expect(root.classList.contains('dark')).toBe(true));
  });

  it('applies the system theme before asynchronous settings hydration completes', async () => {
    let resolveStorage: ((value: string | null) => void) | undefined;
    const storage: SettingsStorage = {
      getItem: () => new Promise((resolve) => (resolveStorage = resolve)),
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const store = createLightningSettingsStore({ storage, systemTheme: 'light' });
    const root = document.createElement('div');
    render(
      <ThemeProvider root={root} store={store}>
        <span>ready</span>
      </ThemeProvider>,
    );
    expect(root.dataset.theme).toBe('light');
    resolveStorage?.(JSON.stringify({ state: { theme: 'dark', captionsEnabled: true, playbackRate: 1 }, version: 1 }));
    await waitFor(() => expect(root.dataset.theme).toBe('dark'));
  });
});
