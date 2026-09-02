import { ArrowSquareOut, BookOpen } from '@phosphor-icons/react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { canonicalEchoUrl } from '../integrations/echo/routing/routes';
import { Button } from '../shared/ui/button';

export function AppShell({ children, onUseOriginal }: { children: ReactNode; onUseOriginal: (url: string) => void }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentUrl = canonicalEchoUrl(new URL(router.history.location.href, window.location.href));
  const isClassroom = pathname.includes('/lesson/') || pathname.includes('/classroom');
  const skipLink = (
    <a
      href="#main-content"
      className="bg-background text-foreground focus-visible:ring-ring focus-visible:ring-offset-background sr-only z-[2147483646] px-4 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      Skip to content
    </a>
  );
  if (isClassroom) {
    return (
      <div className="bg-background text-foreground h-dvh min-h-0 overflow-hidden">
        {skipLink}
        <main id="main-content" tabIndex={-1} className="h-full min-h-0 overflow-hidden focus:outline-none">
          {children}
        </main>
      </div>
    );
  }
  return (
    <div className="bg-background text-foreground min-h-screen">
      {skipLink}
      <header className="bg-card/95 flex h-14 items-center justify-between border-b px-4 shadow-sm backdrop-blur">
        <Link
          to="/courses"
          aria-label="Echo360 Lightning"
          className="focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <BookOpen className="text-primary size-5" aria-hidden="true" />
          Echo360 Lightning
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onUseOriginal(currentUrl)}>
            <ArrowSquareOut className="size-4" />
            Use original Echo UI
          </Button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-5xl flex-col gap-6 p-6 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
