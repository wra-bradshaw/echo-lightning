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
import { Card, CardContent, CardHeader, CardTitle } from '../shared/ui/card';
import { AppShell } from './app-shell';

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

function CoursesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Your courses</h1>
      <p className="text-muted-foreground">Choose a course to continue.</p>
    </>
  );
}

function CourseDetailsPage() {
  const { courseId } = courseDetailsRoute.useParams();
  return (
    <>
      <h1 className="text-2xl font-semibold">Course {courseId}</h1>
      <p className="text-muted-foreground">Choose a lecture to continue.</p>
    </>
  );
}

function SectionPage() {
  const { sectionId } = sectionRoute.useParams();
  return (
    <>
      <h1 className="text-2xl font-semibold">Section {sectionId}</h1>
      <p className="text-muted-foreground">Section syllabus and recorded lectures.</p>
    </>
  );
}

function ClassroomPage() {
  const { lessonId } = classroomRoute.useParams();
  return (
    <>
      <h1 className="text-2xl font-semibold">Lesson {lessonId}</h1>
      <ClassroomCard />
    </>
  );
}

function SectionClassroomPage() {
  const { lessonId } = sectionClassroomRoute.useParams();
  return (
    <>
      <h1 className="text-2xl font-semibold">Lesson {lessonId}</h1>
      <ClassroomCard />
    </>
  );
}

function ClassroomCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recorded lecture</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">Player and transcript support will appear here.</p>
      </CardContent>
    </Card>
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

const coursesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/courses', component: CoursesPage });
const courseDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/courses/$courseId',
  component: CourseDetailsPage,
});
const sectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sections/$sectionId',
  component: SectionPage,
});
const classroomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/classrooms/$lessonId',
  component: ClassroomPage,
});
const sectionClassroomRoute = createRoute({
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
