import { ArrowLeft, CircleNotch, Clock, Play, Plus, Trash, VideoCamera } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { PlayerProperties, PlayerSource, SyllabusItem } from '../domain';
import { useCourses } from '../features/courses';
import { getVideoMedia, getWatchedPercentage, useSectionSyllabus, useSectionVideoProgress } from '../features/sections';
import { usePlayerProperties } from '../player/react/use-player-properties';
import { useMediaClock } from '../player/react/use-media-clock';
import { useCaptionTracks } from '../player/react/use-caption-tracks';
import { usePlaybackSync } from '../player/react/use-playback-sync';
import { useVideoSource } from '../player/react/use-video-source';
import { synchronizeSecondaryVideo } from '../player/core/media-sync';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Slider,
} from '../shared/ui';
import { classroomRoute, courseDetailsRoute, coursesRoute, sectionClassroomRoute, sectionRoute } from './router';

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

function courseHref(courseId: string) {
  return { to: '/sections/$sectionId' as const, params: { sectionId: courseId } };
}

export function CoursesPage() {
  const { gateway } = coursesRoute.useRouteContext();
  const coursesQuery = useCourses(gateway);
  const [search, setSearch] = useState('');
  const courses = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return [...(coursesQuery.data ?? [])]
      .filter((course) =>
        normalized
          ? [course.title, course.code, course.institution, course.term].some((value) =>
              value?.toLowerCase().includes(normalized),
            )
          : true,
      )
      .sort((left, right) => {
        if (left.isActive !== right.isActive) return Number(right.isActive ?? false) - Number(left.isActive ?? false);
        const termOrder = (right.termStart ?? '').localeCompare(left.termStart ?? '');
        return termOrder || left.title.localeCompare(right.title);
      });
  }, [coursesQuery.data, search]);

  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary text-sm font-medium">Your learning hub</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your courses</h1>
          <p className="text-muted-foreground mt-1">Pick up a lecture without loading the full Echo360 experience.</p>
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
          <Link key={course.id} {...courseHref(course.sectionId ?? course.id)} className="group block">
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
  const { courseId } = courseDetailsRoute.useParams();
  return (
    <>
      <Link
        to="/courses"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to courses
      </Link>
      <h1 className="text-2xl font-semibold">Course {courseId}</h1>
      <p className="text-muted-foreground">Choose a lecture to continue.</p>
    </>
  );
}

export function SectionPage() {
  const { sectionId } = sectionRoute.useParams();
  const { gateway } = sectionRoute.useRouteContext();
  const coursesQuery = useCourses(gateway);
  const syllabusQuery = useSectionSyllabus(gateway, sectionId);
  const course = coursesQuery.data?.find(
    (candidate) => candidate.sectionId === sectionId || (!candidate.sectionId && candidate.id === sectionId),
  );
  const lessons = useMemo(
    () =>
      [...(syllabusQuery.data ?? [])].sort((left, right) =>
        (left.startTime ?? '').localeCompare(right.startTime ?? ''),
      ),
    [syllabusQuery.data],
  );
  const videoProgress = useSectionVideoProgress(gateway, lessons);
  return (
    <>
      <Link
        to="/courses"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" /> Back to courses
      </Link>
      <section>
        <p className="text-primary text-sm font-medium">Course recordings</p>
        <h1 className="text-3xl font-semibold tracking-tight">{course?.title || 'Course recordings'}</h1>
        <p className="text-muted-foreground mt-1">Choose a lecture to resume where you left off.</p>
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
          return (
            <Card key={lesson.id} className="relative">
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
                {media ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link
                        to="/sections/$sectionId/classrooms/$lessonId"
                        params={{ sectionId, lessonId: lesson.id }}
                      />
                    }
                  >
                    <Play className="size-4" weight="fill" /> Watch lecture
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs">No video available</span>
                )}
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
        })}
      </div>
    </>
  );
}

export function ClassroomPage() {
  const { lessonId } = classroomRoute.useParams();
  const { gateway } = classroomRoute.useRouteContext();
  return <ClassroomExperience gateway={gateway} lessonId={lessonId} />;
}

export function SectionClassroomPage() {
  const { sectionId, lessonId } = sectionClassroomRoute.useParams();
  const { gateway } = sectionClassroomRoute.useRouteContext();
  return <ClassroomExperience gateway={gateway} lessonId={lessonId} sectionId={sectionId} />;
}

function ClassroomExperience({
  gateway,
  lessonId,
  sectionId,
}: {
  gateway: Parameters<typeof useSectionSyllabus>[0];
  lessonId: string;
  sectionId?: string;
}) {
  const syllabusQuery = useSectionSyllabus(gateway, sectionId ?? '', Boolean(sectionId));
  const lesson = syllabusQuery.data?.find((item) => item.id === lessonId);
  return (
    <>
      <Link
        to={sectionId ? '/sections/$sectionId' : '/courses'}
        params={sectionId ? { sectionId } : undefined}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" /> {sectionId ? 'Back to lectures' : 'Back to courses'}
      </Link>
      <section>
        <p className="text-primary text-sm font-medium">Lecture player</p>
        <h1 className="text-3xl font-semibold tracking-tight">{lesson?.title || `Lesson ${lessonId}`}</h1>
      </section>
      {!sectionId ? <ErrorState label="Open a lecture from a course to load its media." /> : null}
      {sectionId && syllabusQuery.isLoading ? <LoadingState label="Preparing lecture…" /> : null}
      {sectionId && syllabusQuery.isError ? <ErrorState label="This lecture could not be loaded." /> : null}
      {sectionId && !syllabusQuery.isLoading && !syllabusQuery.isError && !lesson ? (
        <ErrorState label="This lecture is no longer available." />
      ) : null}
      {lesson ? <LessonPlayer gateway={gateway} lesson={lesson} /> : null}
    </>
  );
}

function LessonPlayer({
  gateway,
  lesson,
}: {
  gateway: Parameters<typeof useSectionSyllabus>[0];
  lesson: SyllabusItem;
}) {
  const media = lesson.media.find((item) => item.available !== false && !item.audioOnly) ?? lesson.media[0];
  const playerQuery = usePlayerProperties(gateway, 'lessons', lesson.id, media?.id ?? '', Boolean(media));
  return (
    <>
      {playerQuery.isLoading ? <LoadingState label="Preparing video sources…" /> : null}
      {playerQuery.isError ? <ErrorState label="Video sources could not be loaded for this lecture." /> : null}
      {playerQuery.data ? <MultiCameraPlayer gateway={gateway} lesson={lesson} properties={playerQuery.data} /> : null}
    </>
  );
}

function MultiCameraPlayer({
  gateway,
  lesson,
  properties,
}: {
  gateway: Parameters<typeof useSectionSyllabus>[0];
  lesson: SyllabusItem;
  properties: PlayerProperties;
}) {
  const sources = properties.sources;
  const [activeIds, setActiveIds] = useState(() =>
    sources.slice(0, Math.min(2, sources.length)).map((source) => source.id),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [videoElements, setVideoElements] = useState<Record<string, HTMLVideoElement>>({});
  const [draggedId, setDraggedId] = useState<string>();
  const videoMap = useRef(videoElements);
  const syncing = useRef(false);
  const resumePosition = properties.positionSeconds;
  const sourceMap = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const activeSources = activeIds.flatMap((id) => {
    const source = sourceMap.get(id);
    return source ? [source] : [];
  });
  const leader = videoElements[activeIds[0] ?? ''] ?? null;
  const currentTime = useMediaClock(leader);
  const duration = properties.durationSeconds ?? lesson.durationSeconds ?? 0;
  const { savePosition } = usePlaybackSync({
    gateway,
    mediaId: properties.mediaId,
    leader,
    duration,
  });
  const bindVideo = useCallback((id: string, element: HTMLVideoElement | null) => {
    setVideoElements((current) => {
      const next = { ...current };
      if (element) next[id] = element;
      else delete next[id];
      videoMap.current = next;
      return next;
    });
  }, []);

  const setAllCurrentTime = useCallback((time: number) => {
    for (const element of Object.values(videoMap.current)) {
      if (Math.abs(element.currentTime - time) > 0.05) element.currentTime = time;
    }
  }, []);

  const togglePlayback = useCallback(() => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    for (const element of Object.values(videoMap.current)) {
      if (nextPlaying) void element.play().catch(() => setIsPlaying(false));
      else element.pause();
    }
  }, [isPlaying]);

  const handlePlay = useCallback((id: string) => {
    setIsPlaying(true);
    if (syncing.current) return;
    syncing.current = true;
    for (const [otherId, element] of Object.entries(videoMap.current))
      if (otherId !== id) void element.play().catch(() => undefined);
    queueMicrotask(() => {
      syncing.current = false;
    });
  }, []);

  const handlePause = useCallback((id: string) => {
    if (syncing.current) return;
    setIsPlaying(false);
    syncing.current = true;
    for (const [otherId, other] of Object.entries(videoMap.current)) if (otherId !== id) other.pause();
    queueMicrotask(() => {
      syncing.current = false;
    });
  }, []);

  const moveSource = (id: string, direction: -1 | 1) => {
    setActiveIds((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      return next;
    });
  };

  const removeSource = (id: string) =>
    setActiveIds((current) => (current.length > 1 ? current.filter((sourceId) => sourceId !== id) : current));
  const addSource = (id: string) => setActiveIds((current) => (current.includes(id) ? current : [...current, id]));
  const onDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setActiveIds((current) => {
      const without = current.filter((id) => id !== draggedId);
      const index = without.indexOf(targetId);
      without.splice(index < 0 ? without.length : index, 0, draggedId);
      return without;
    });
    setDraggedId(undefined);
  };

  return (
    <Card className="overflow-visible">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <VideoCamera className="text-primary size-5" /> Multi-camera player
            </CardTitle>
            <CardDescription className="mt-1">
              Drag cameras to reorder them. Resize a tile from its corner.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sources
              .filter((source) => !activeIds.includes(source.id))
              .map((source) => (
                <Button key={source.id} variant="outline" size="sm" onClick={() => addSource(source.id)}>
                  <Plus className="size-4" /> Add {source.label}
                </Button>
              ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2" data-testid="camera-grid">
          {activeSources.map((source, index) => (
            <VideoTile
              key={source.id}
              source={source}
              initialPosition={resumePosition}
              captions={properties.captions}
              captionsEnabled={captionsEnabled}
              audioEnabled={index === 0}
              playbackRate={playbackRate}
              onVideo={bindVideo}
              onPlay={() => handlePlay(source.id)}
              onPause={() => handlePause(source.id)}
              onTimeUpdate={(element) => {
                if (index !== 0 && leader) synchronizeSecondaryVideo(leader, element);
              }}
              onDragStart={() => setDraggedId(source.id)}
              onDrop={() => onDrop(source.id)}
            />
          ))}
        </div>
        <div className="bg-muted/20 space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="default" size="sm" onClick={togglePlayback}>
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <span className="text-muted-foreground text-sm tabular-nums">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
            <select
              aria-label="Playback speed"
              value={playbackRate}
              onChange={(event) => {
                const rate = Number(event.target.value);
                setPlaybackRate(rate);
                for (const element of Object.values(videoMap.current)) element.playbackRate = rate;
              }}
              className="bg-background h-8 rounded-lg border px-2 text-sm"
            >
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
            <Button
              variant={captionsEnabled ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setCaptionsEnabled((enabled) => !enabled)}
            >
              Captions {captionsEnabled ? 'on' : 'off'}
            </Button>
          </div>
          <Slider
            aria-label="Lecture timeline"
            value={[Math.min(currentTime, duration || currentTime)]}
            min={0}
            max={duration || 1}
            step={1}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? Number(value[0]) : Number(value);
              if (Number.isFinite(next)) setAllCurrentTime(next);
            }}
            onValueCommitted={() => savePosition()}
          />
          <div className="flex flex-wrap gap-2">
            {activeSources.map((source, index) => (
              <span key={source.id} className="inline-flex items-center gap-1 text-xs">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move ${source.label} left`}
                  disabled={index === 0}
                  onClick={() => moveSource(source.id, -1)}
                >
                  ←
                </Button>
                <span>{source.label}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move ${source.label} right`}
                  disabled={index === activeSources.length - 1}
                  onClick={() => moveSource(source.id, 1)}
                >
                  →
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${source.label}`}
                  disabled={activeSources.length === 1}
                  onClick={() => removeSource(source.id)}
                >
                  <Trash className="size-3" />
                </Button>
              </span>
            ))}
          </div>
        </div>
        {resumePosition > 0 ? (
          <p className="text-muted-foreground text-xs">
            Resuming at {formatDuration(resumePosition)}. Progress is saved to Echo360.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VideoTile({
  source,
  initialPosition,
  captions,
  captionsEnabled,
  audioEnabled,
  playbackRate,
  onVideo,
  onPlay,
  onPause,
  onTimeUpdate,
  onDragStart,
  onDrop,
}: {
  source: PlayerSource;
  initialPosition: number;
  captions: PlayerProperties['captions'];
  captionsEnabled: boolean;
  audioEnabled: boolean;
  playbackRate: number;
  onVideo: (id: string, element: HTMLVideoElement | null) => void;
  onPlay: () => void;
  onPause: (element: HTMLVideoElement) => void;
  onTimeUpdate: (element: HTMLVideoElement) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [media, setMedia] = useState<HTMLVideoElement | null>(null);
  const status = useVideoSource(media, source, initialPosition);
  useCaptionTracks(media, captionsEnabled);
  const ref = useCallback(
    (element: HTMLVideoElement | null) => {
      setMedia(element);
      onVideo(source.id, element);
    },
    [onVideo, source.id],
  );
  return (
    <div
      data-testid="camera-tile"
      className="group relative min-h-48 overflow-auto rounded-lg border bg-black"
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      style={{ resize: 'both' }}
    >
      <video
        ref={ref}
        className="aspect-video h-full min-h-48 w-full object-contain"
        crossOrigin="use-credentials"
        muted={!audioEnabled}
        playsInline
        preload="metadata"
        aria-label={source.label}
        onPlay={onPlay}
        onPause={(event) => onPause(event.currentTarget)}
        onTimeUpdate={(event) => onTimeUpdate(event.currentTarget)}
        onRateChange={(event) => {
          event.currentTarget.playbackRate = playbackRate;
        }}
      >
        {captions.map((caption) => (
          <track
            key={caption.src}
            kind={caption.kind ?? 'captions'}
            src={caption.src}
            srcLang={caption.language}
            label={caption.label}
          />
        ))}
      </video>
      <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
        {source.label}
      </span>
      {status === 'loading' ? (
        <span className="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
          Loading source…
        </span>
      ) : null}
      {status === 'error' ? (
        <span className="bg-destructive absolute right-2 bottom-2 rounded px-2 py-1 text-xs text-white">
          Source unavailable
        </span>
      ) : null}
    </div>
  );
}
