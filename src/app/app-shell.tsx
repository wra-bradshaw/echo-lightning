import { ArrowSquareOut, BookOpen, Moon, Sun } from '@phosphor-icons/react';
import type { EchoNavigation } from '../echo/navigation';
import { useEchoRoute } from '../echo/navigation';
import type { EchoRoute } from '../echo/routes';
import { Button } from '../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/ui/card';
import { useTheme } from './theme';

function RouteContent({ route }: { route: EchoRoute }) {
  if (route.kind === 'courses')
    return (
      <>
        <h1 className="text-2xl font-semibold">Your courses</h1>
        <p className="text-muted-foreground">Choose a course to continue.</p>
      </>
    );
  if (route.kind === 'section')
    return (
      <>
        <h1 className="text-2xl font-semibold">Section</h1>
        <p className="text-muted-foreground">Section {route.sectionId}</p>
      </>
    );
  if (route.kind === 'classroom')
    return (
      <>
        <h1 className="text-2xl font-semibold">Classroom</h1>
        <p className="text-muted-foreground">Lesson {route.lessonId}</p>
        <Card>
          <CardHeader>
            <CardTitle>Recorded lecture</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Player and transcript support will appear here.</p>
          </CardContent>
        </Card>
      </>
    );
  return (
    <>
      <h1 className="text-2xl font-semibold">This Echo360 page is not supported yet</h1>
      <p className="text-muted-foreground">You can continue in the official interface.</p>
    </>
  );
}

export function AppShell({
  navigation,
  onUseOriginal,
}: {
  navigation: EchoNavigation;
  onUseOriginal: (url?: string) => void;
}) {
  const route = useEchoRoute(navigation);
  const { theme, setTheme } = useTheme();
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
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onUseOriginal(route.url)}>
            <ArrowSquareOut className="size-4" />
            Use original Echo UI
          </Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <RouteContent route={route} />
      </main>
    </div>
  );
}
