import { ArrowSquareOut, BookOpen, Moon, Sun } from '@phosphor-icons/react';
import { useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { canonicalEchoUrl } from '../integrations/echo';
import { Button } from '../shared/ui/button';
import { useTheme } from './theme';

export function AppShell({ children, onUseOriginal }: { children: ReactNode; onUseOriginal: (url: string) => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const currentUrl = canonicalEchoUrl(new URL(router.history.location.href, window.location.href));
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-card/95 flex h-14 items-center justify-between border-b px-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpen className="text-primary size-5" aria-hidden="true" />
          Echo360 Lightning
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
            Lightning active
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onUseOriginal(currentUrl)}>
            <ArrowSquareOut className="size-4" />
            Use original Echo UI
          </Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">{children}</main>
    </div>
  );
}
