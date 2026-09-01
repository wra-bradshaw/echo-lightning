import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../shared/ui/button';
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
});
