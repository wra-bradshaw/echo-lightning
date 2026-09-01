import { ArrowSquareOut, BookOpen } from '@phosphor-icons/react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { canonicalEchoUrl } from '../integrations/echo';
import { Button } from '../shared/ui/button';

export function AppShell({ children, onUseOriginal }: { children: ReactNode; onUseOriginal: (url: string) => void }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentUrl = canonicalEchoUrl(new URL(router.history.location.href, window.location.href));
  const isClassroom = pathname.includes('/classrooms/') || pathname.startsWith('/classroom/');
  if (isClassroom) {
    return (
      <div className="bg-background text-foreground h-dvh min-h-0 overflow-hidden">
        <main className="h-full min-h-0">{children}</main>
      </div>
    );
  }
  return (
    <div className="bg-background text-foreground min-h-screen">
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
          <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-medium">
            Lightning active
          </span>
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
