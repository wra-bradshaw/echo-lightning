import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { EchoGateway } from '../domain';
import type { LightningSettingsStore } from '../features/settings';
import { rewriteEchoInput, rewriteEchoOutput } from '../integrations/echo/routing/routes';
import { parseQueryString, stringifyQueryString } from '../platform/browser/query-string';
import { AppShell } from './app-shell';
import { ClassroomPage, CourseDetailsPage, CoursesPage, SectionPage } from './pages';
import {
  classroomRoutePath,
  courseDetailsRoutePath,
  coursesRoutePath,
  sectionRoutePath,
  type LightningRouterContext,
} from './routes';

function UnsupportedPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">This Echo360 page is not supported yet</h1>
      <p className="text-muted-foreground">You can continue in the official interface.</p>
    </>
  );
}

const rootRoute = createRootRouteWithContext<LightningRouterContext>()({
  component: () => {
    const context = rootRoute.useRouteContext();
    return (
      <AppShell onUseOriginal={context.onUseOriginal}>
        <Outlet />
      </AppShell>
    );
  },
  notFoundComponent: UnsupportedPage,
});

const coursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: coursesRoutePath,
  component: CoursesPage,
});
const courseDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: courseDetailsRoutePath,
  component: CourseDetailsPage,
});
const sectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: sectionRoutePath,
  component: SectionPage,
});
const classroomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: classroomRoutePath,
  component: ClassroomPage,
});

const lightningRouteTree = rootRoute.addChildren([coursesRoute, courseDetailsRoute, sectionRoute, classroomRoute]);

export function createLightningRouter(options: {
  history: RouterHistory;
  gateway: EchoGateway;
  queryClient: QueryClient;
  onUseOriginal: (url?: string) => void;
  settingsStore?: LightningSettingsStore;
}) {
  return createRouter({
    routeTree: lightningRouteTree,
    history: options.history,
    context: {
      gateway: options.gateway,
      queryClient: options.queryClient,
      onUseOriginal: options.onUseOriginal,
      settingsStore: options.settingsStore,
    },
    rewrite: { input: rewriteEchoInput, output: rewriteEchoOutput },
    parseSearch: parseQueryString,
    stringifySearch: stringifyQueryString,
    defaultNotFoundComponent: UnsupportedPage,
    defaultPreload: 'intent',
  });
}
