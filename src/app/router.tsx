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
import { rewriteEchoInput, rewriteEchoOutput } from '../integrations/echo';
import { AppShell } from './app-shell';
import { ClassroomPage, CourseDetailsPage, CoursesPage, SectionClassroomPage, SectionPage } from './pages';

export type LightningRouterContext = {
  gateway: EchoGateway;
  queryClient: QueryClient;
  onUseOriginal: (url?: string) => void;
  settingsStore?: LightningSettingsStore;
};

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

export const coursesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/courses', component: CoursesPage });
export const courseDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/courses/$courseId',
  component: CourseDetailsPage,
});
export const sectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sections/$sectionId',
  component: SectionPage,
});
export const classroomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/classrooms/$lessonId',
  component: ClassroomPage,
});
export const sectionClassroomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sections/$sectionId/classrooms/$lessonId',
  component: SectionClassroomPage,
});

export const lightningRouteTree = rootRoute.addChildren([
  coursesRoute,
  courseDetailsRoute,
  sectionRoute,
  classroomRoute,
  sectionClassroomRoute,
]);

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
    defaultNotFoundComponent: UnsupportedPage,
    defaultPreload: 'intent',
  });
}
