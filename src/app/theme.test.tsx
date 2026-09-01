import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../shared/ui/button';
import { ThemeProvider } from './theme';

function createSystemThemeMediaQuery(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    setMatches(nextMatches: boolean) {
      media.matches = nextMatches;
      listeners.forEach((listener) => listener());
    },
  };
  return media;
}

describe('theme and shared UI', () => {
  it('follows system theme changes and renders shadcn primitives', async () => {
    const media = createSystemThemeMediaQuery(true);
    const previousMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => media) });
    const root = document.createElement('div');
    try {
      render(
        <ThemeProvider root={root}>
          <Button>Continue</Button>
        </ThemeProvider>,
      );
      expect(root.dataset.theme).toBe('dark');
      expect(root).toHaveClass('dark');
      screen.getByRole('button', { name: 'Continue' });

      media.setMatches(false);
      await waitFor(() => {
        expect(root.dataset.theme).toBe('light');
        expect(root).not.toHaveClass('dark');
      });
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: previousMatchMedia });
    }
  });
});
