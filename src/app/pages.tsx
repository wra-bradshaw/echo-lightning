import { ArrowLeft, CircleNotch, Clock } from '@phosphor-icons/react';
import { getRouteApi, Link, useRouter } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode } from 'react';
import type { EchoGateway, SyllabusItem } from '../domain';
import { useCourses } from '../features/courses';
import {
  getVideoMedia,
  getWatchedPercentage,
  useLesson,
  useSectionSyllabus,
  useSectionVideoProgress,
} from '../features/sections';
import { useLightningSettingsBundle } from '../features/settings';
import { AuthenticationError } from '../integrations/echo/transport/errors';
import { officialLoginUrl } from '../integrations/echo/transport/authentication-recovery';
import { canonicalEchoUrl } from '../integrations/echo/routing/routes';
import { usePlayerProperties } from '../player/react/use-player-properties';
import { PlayerViewport } from '../player/react/player-viewport';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../shared/ui/card';
import { Input } from '../shared/ui/input';
import { Progress } from '../shared/ui/progress';
import { classroomRoutePath, courseDetailsRoutePath, coursesRoutePath, sectionRoutePath } from './routes';

const coursesRouteApi = getRouteApi(coursesRoutePath);
const courseDetailsRouteApi = getRouteApi(courseDetailsRoutePath);
const sectionRouteApi = getRouteApi(sectionRoutePath);
const classroomRouteApi = getRouteApi(classroomRoutePath);

function LoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground flex items-center gap-3 py-10 text-sm">
        <CircleNotch className="size-4 animate-spin" />
        {label}
      </CardContent>
    </Card>
  );
}

function ErrorState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="text-destructive py-10 text-sm">{label}</CardContent>
    </Card>
  );
}

function isAuthenticationError(error: unknown): boolean {
  return error instanceof AuthenticationError;
}

export function AuthRequiredState() {
  const router = useRouter();
  const current = (() => {
    try {
      return canonicalEchoUrl(new URL(router.history.location.href, window.location.href));
    } catch {
      return window.location.href;
    }
  })();
  const loginUrl = officialLoginUrl(current);
  const context = (router.options as unknown as { context?: { onUseOriginal?: (url?: string) => void } }).context;
  return (
    <Card>
      <CardContent className="space-y-3 py-10 text-center">
        <p className="font-medium">Please sign in to view Echo360 recordings</p>
        <p className="text-muted-foreground text-sm">Lightning hides the original UI only while you’re signed in.</p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => window.location.assign(loginUrl)}>Sign in via Echo360</Button>
          <Button variant="outline" onClick={() => context?.onUseOriginal?.(current)}>
            Use original Echo UI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 1) return '';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatDate(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function sectionHref(sectionId: string) {
  return { to: '/section/$sectionId/home' as const, params: { sectionId } };
}

export function CoursesPage() {
  const { gateway } = coursesRouteApi.useRouteContext();
  const coursesQuery = useCourses(gateway);
  const [search, setSearch] = useState('');
  const courses = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (coursesQuery.data ?? [])
      .filter((course) =>
        normalized
          ? [course.title, course.code, course.institution, course.term].some((value) =>
              value?.toLowerCase().includes(normalized),
            )
          : true,
      )
      .toSorted((left, right) => {
        if (left.isActive !== right.isActive) return Number(right.isActive ?? false) - Number(left.isActive ?? false);
        const termOrder = (right.termStart ?? '').localeCompare(left.termStart ?? '');
        return termOrder || left.title.localeCompare(right.title);
      });
  }, [coursesQuery.data, search]);

  if (isAuthenticationError(coursesQuery.error)) return <AuthRequiredState />;

  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your courses</h1>
        </div>
        <div className="w-full sm:max-w-xs">
          <label className="text-muted-foreground mb-1 block text-xs font-medium" htmlFor="course-search">
            Search courses
          </label>
          <Input
            id="course-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or code"
          />
        </div>
      </section>
      {coursesQuery.isLoading ? <LoadingState label="Loading your courses…" /> : null}
      {coursesQuery.isError ? <ErrorState label="Courses could not be loaded. Try refreshing this tab." /> : null}
      {!coursesQuery.isLoading && !coursesQuery.isError && courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">No matching courses</p>
            <p className="text-muted-foreground mt-1 text-sm">Try a different search or check the original Echo UI.</p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <Link
            key={course.id}
            {...sectionHref(course.sectionId)}
            className="group focus-visible:ring-ring focus-visible:ring-offset-background block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Card className="group-hover:border-primary/50 h-full transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{course.title || 'Untitled course'}</CardTitle>
                    <CardDescription className="mt-1">{course.code ?? course.institution ?? course.id}</CardDescription>
                  </div>
                  {course.isActive ? <Badge variant="secondary">Current term</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">
                  {course.term ?? course.institution ?? 'Course recordings'}
                </span>
                {course.lessonCount !== undefined ? (
                  <span className="text-muted-foreground text-sm">{course.lessonCount} lectures</span>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

export function CourseDetailsPage() {
  const { courseId } = courseDetailsRouteApi.useParams();
  return (
    <>
      <Link
        to="/courses"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-2 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="size-4" /> Back to courses
      </Link>
      <h1 className="text-2xl font-semibold">Course {courseId}</h1>
      <p className="text-muted-foreground">Choose a lecture to continue.</p>
    </>
  );
}

export function SectionPage() {
  const { sectionId } = sectionRouteApi.useParams();
  const { gateway } = sectionRouteApi.useRouteContext();
  const coursesQuery = useCourses(gateway);
  const syllabusQuery = useSectionSyllabus(gateway, sectionId);
  const course = coursesQuery.data?.find((candidate) => candidate.sectionId === sectionId);
  const lessons = useMemo(
    () =>
      (syllabusQuery.data ?? []).toSorted((left, right) => (left.startTime ?? '').localeCompare(right.startTime ?? '')),
    [syllabusQuery.data],
  );
  const videoProgress = useSectionVideoProgress(gateway, lessons);
  if (isAuthenticationError(syllabusQuery.error) || isAuthenticationError(coursesQuery.error)) {
    return <AuthRequiredState />;
  }
  return (
    <>
      <Link
        to="/courses"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-2 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="size-4" /> Back to courses
      </Link>
      <section>
        <p className="text-primary text-sm font-medium">Course recordings</p>
        <h1 className="text-3xl font-semibold tracking-tight">{course?.title || 'Course recordings'}</h1>
      </section>
      {syllabusQuery.isLoading ? <LoadingState label="Loading lectures…" /> : null}
      {syllabusQuery.isError ? <ErrorState label="Lectures could not be loaded. Try refreshing this tab." /> : null}
      {!syllabusQuery.isLoading && !syllabusQuery.isError && lessons.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">No lectures found</p>
            <p className="text-muted-foreground mt-1 text-sm">This course does not have recordings available yet.</p>
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-3">
        {lessons.map((lesson, index) => {
          const media = getVideoMedia(lesson);
          const properties = videoProgress.get(lesson.id);
          const watchedPercentage = getWatchedPercentage(
            properties?.positionSeconds,
            properties?.durationSeconds,
            lesson.durationSeconds,
          );
          const card = (
            <Card key={lesson.id} className="group-hover:border-primary/50 relative h-full transition-colors">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">{index + 1}</span>
                    <h2 className="truncate font-medium">{lesson.title || `Lecture ${index + 1}`}</h2>
                  </div>
                  <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {lesson.startTime ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDate(lesson.startTime)}
                      </span>
                    ) : null}
                    {lesson.durationSeconds ? <span>{formatDuration(lesson.durationSeconds)}</span> : null}
                  </div>
                </div>
                {!media ? <span className="text-muted-foreground text-xs">No video available</span> : null}
              </CardContent>
              {media ? (
                <Progress
                  value={watchedPercentage}
                  indicatorClassName="bg-blue-500"
                  className="absolute right-0 bottom-0 left-0 block gap-0"
                  aria-label={`${Math.round(watchedPercentage)}% watched`}
                />
              ) : null}
            </Card>
          );
          return media ? (
            <Link
              key={lesson.id}
              to="/lesson/$lessonId/classroom"
              params={{ lessonId: lesson.id }}
              className="group focus-visible:ring-ring focus-visible:ring-offset-background block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {card}
            </Link>
          ) : (
            card
          );
        })}
      </div>
    </>
  );
}

export function ClassroomPage() {
  const { lessonId } = classroomRouteApi.useParams();
  const { gateway } = classroomRouteApi.useRouteContext();
  const { lesson, sectionId, isLoading, isError, error } = useLesson(gateway, lessonId);
  if (isAuthenticationError(error)) {
    return (
      <ClassroomState title={`Lesson ${lessonId}`}>
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-md">
            <AuthRequiredState />
          </div>
        </div>
      </ClassroomState>
    );
  }
  if (isLoading) {
    return (
      <ClassroomState title={`Lesson ${lessonId}`}>
        <ClassroomMessage label="Preparing lecture…" />
      </ClassroomState>
    );
  }
  if (isError) {
    return (
      <ClassroomState title={`Lesson ${lessonId}`}>
        <ClassroomMessage label="This lecture could not be loaded." error />
      </ClassroomState>
    );
  }
  if (!lesson) {
    return (
      <ClassroomState title={`Lesson ${lessonId}`}>
        <ClassroomMessage label="This lecture is no longer available." error />
      </ClassroomState>
    );
  }
  return (
    <ClassroomState title={lesson.title || `Lesson ${lessonId}`}>
      <LessonPlayer gateway={gateway} lesson={lesson} sectionId={sectionId} />
    </ClassroomState>
  );
}

function ClassroomState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <h1 className="sr-only">{title}</h1>
      {children}
    </div>
  );
}

function LessonPlayer({
  gateway,
  lesson,
  sectionId,
}: {
  gateway: EchoGateway;
  lesson: SyllabusItem;
  sectionId?: string;
}) {
  const media = lesson.media.find((item) => item.available !== false && !item.audioOnly) ?? lesson.media[0];
  const playerQuery = usePlayerProperties(gateway, 'lessons', lesson.id, media?.id ?? '', Boolean(media));
  const settings = useLightningSettingsBundle(sectionId);
  const {
    savedSelectedIds,
    setSelectedStreamIds,
    savedPlayerState,
    setPlayerState,
    savedPipSize,
    setPipSize,
    savedVolume,
    setVolumeForSection,
    savedPlaybackRate,
    setPlaybackRateForSection,
    setPlaybackRateGlobal,
    savedCaptionsEnabled,
    setCaptionsEnabledForSection,
    setCaptionsEnabledGlobal,
    savedIsMuted,
    setMutedForSection,
  } = settings;
  if (isAuthenticationError(playerQuery.error)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md">
          <AuthRequiredState />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden">
      {playerQuery.isLoading ? <ClassroomMessage label="Preparing video sources…" /> : null}
      {playerQuery.isError ? (
        <ClassroomMessage label="Video sources could not be loaded for this lecture." error />
      ) : null}
      {playerQuery.data ? (
        <PlayerViewport
          gateway={gateway}
          lesson={lesson}
          properties={playerQuery.data}
          sectionId={sectionId}
          settings={{
            savedSelectedIds,
            onSelectedIdsChange: sectionId ? (ids) => setSelectedStreamIds(sectionId, ids) : undefined,
            savedPlayerState,
            onPlayerStateChange: sectionId ? (state) => setPlayerState(sectionId, state) : undefined,
            savedPipSize,
            onPipSizeChange: sectionId ? (size) => setPipSize(sectionId, size) : undefined,
            savedVolume,
            onVolumeChange: sectionId ? (volume) => setVolumeForSection(sectionId, volume) : undefined,
            savedPlaybackRate,
            onPlaybackRateChange: sectionId
              ? (rate) => setPlaybackRateForSection(sectionId, rate)
              : (rate) => setPlaybackRateGlobal(rate),
            savedCaptionsEnabled,
            onCaptionsEnabledChange: sectionId
              ? (enabled) => setCaptionsEnabledForSection(sectionId, enabled)
              : (enabled) => setCaptionsEnabledGlobal(enabled),
            savedIsMuted,
            onIsMutedChange: sectionId ? (muted) => setMutedForSection(sectionId, muted) : undefined,
          }}
        />
      ) : null}
    </div>
  );
}

function ClassroomMessage({ label, error = false }: { label: string; error?: boolean }) {
  return (
    <div className="bg-background text-foreground flex h-full items-center justify-center p-6">
      <div className="flex items-center gap-3 text-sm">
        {!error ? <CircleNotch className="size-4 animate-spin" /> : null}
        <span className={error ? 'text-destructive' : 'text-muted-foreground'}>{label}</span>
      </div>
    </div>
  );
}
