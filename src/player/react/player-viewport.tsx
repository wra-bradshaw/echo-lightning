import { ArrowLeft, CaretDown, Check, Pause, Play, SpeakerHigh, SpeakerSlash, Trash, X } from '@phosphor-icons/react';
import { MotionConfig, motion, useDragControls, type PanInfo } from 'motion/react';
import { Link } from '@tanstack/react-router';
import { useCallback, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { EchoGateway, PlayerProperties, PlayerSource, SyllabusItem } from '../../domain';
import { calculateGridLayout } from '../core/grid-layout';
import {
  clampPipPosition,
  getPipCoordinates,
  placePipInNearestCorner,
  placePipStacks,
  type PipPosition,
} from '../core/pip-placement';
import type { PlayerAction } from '../core/player-state';
import { synchronizeSecondaryVideo } from '../core/media-sync';
import { useCaptionTracks } from './use-caption-tracks';
import { useControlVisibility } from './use-control-visibility';
import { useElementSize } from './use-element-size';
import { useMediaClock } from './use-media-clock';
import { usePlaybackSync } from './use-playback-sync';
import { usePlayerState } from './use-player-state';
import { useVideoSource } from './use-video-source';
import { Button, Slider, Tabs, TabsList, TabsTrigger } from '../../shared/ui';
import { cn } from '../../shared/lib/cn';

type PlayerViewportProps = {
  gateway: EchoGateway;
  lesson: SyllabusItem;
  properties: PlayerProperties;
  sectionId?: string;
  onUseOriginal: () => void;
  savedSelectedIds?: readonly string[];
  onSelectedIdsChange?: (ids: readonly string[]) => void;
  captionsEnabled: boolean;
  onCaptionsEnabledChange: (enabled: boolean) => void;
};

type VideoElements = Record<string, HTMLVideoElement>;

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 1) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function sourceById(sources: readonly PlayerSource[], ids: readonly string[]): PlayerSource[] {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  return ids.flatMap((id) => {
    const source = sourcesById.get(id);
    return source ? [source] : [];
  });
}

export function PlayerViewport({
  gateway,
  lesson,
  properties,
  sectionId,
  onUseOriginal,
  savedSelectedIds,
  onSelectedIdsChange,
  captionsEnabled,
  onCaptionsEnabledChange,
}: PlayerViewportProps) {
  const sources = properties.sources;
  const sourceIds = useMemo(() => sources.map((source) => source.id), [sources]);
  const { state, dispatch } = usePlayerState(sourceIds, savedSelectedIds, onSelectedIdsChange);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackPosition, setPlaybackPosition] = useState(properties.positionSeconds);
  const [videoElements, setVideoElements] = useState<VideoElements>({});
  const videoMap = useRef<VideoElements>({});
  const syncing = useRef(false);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [streamMenuOpen, setStreamMenuOpen] = useState(false);
  const { ref: sizeRef, element: viewportElement, size: viewportSize } = useElementSize<HTMLDivElement>();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const viewportRef = useCallback(
    (element: HTMLDivElement | null) => {
      sizeRef(element);
      constraintsRef.current = element;
    },
    [sizeRef],
  );
  const controls = useControlVisibility({ isPlaying });
  const activeSources = useMemo(() => sourceById(sources, state.selectedIds), [sources, state.selectedIds]);
  const mainSource = sources.find((source) => source.id === state.mainId) ?? activeSources[0];
  const leader = videoElements[state.mode === 'focus' ? state.mainId : state.audioId] ?? null;
  const currentTime = useMediaClock(leader);
  const streamInitialPosition = playbackPosition > 0 ? playbackPosition : currentTime;
  const dispatchPlayerAction = useCallback(
    (action: PlayerAction) => {
      const currentLeader = videoMap.current[state.mode === 'focus' ? state.mainId : state.audioId];
      const targetId =
        action.type === 'focus' || action.type === 'set-audio' || action.type === 'promote'
          ? action.id
          : action.type === 'set-mode' && action.mode === 'focus'
            ? state.mainId
            : undefined;
      const target = targetId ? videoMap.current[targetId] : undefined;
      const positionSource = currentLeader ?? target;
      if (positionSource && Number.isFinite(positionSource.currentTime)) {
        const position = positionSource.currentTime;
        setPlaybackPosition(position);
        if (target && currentLeader && currentLeader !== target) target.currentTime = position;
      }
      dispatch(action);
    },
    [dispatch, state.audioId, state.mainId, state.mode],
  );
  const duration = properties.durationSeconds ?? lesson.durationSeconds ?? 0;
  const { savePosition } = usePlaybackSync({
    gateway,
    mediaId: properties.mediaId,
    leader,
    duration,
  });
  const gridLayout = calculateGridLayout({
    width: viewportSize.width - 32,
    height: viewportSize.height - 112,
    aspectRatios: activeSources.map((source) => aspectRatios[source.id]),
    gap: 12,
  });
  const pipSize = useMemo(
    () => ({
      width: Math.min(320, Math.max(148, viewportSize.width * 0.22)),
      height: Math.min(180, Math.max(83, (viewportSize.width * 0.22 * 9) / 16)),
    }),
    [viewportSize.width],
  );
  const pipIds = state.selectedIds.filter((id) => id !== state.mainId);
  const pipPositions = useMemo(
    () => placePipStacks(pipIds, state.pipPositions, viewportSize, pipSize, 16, 12),
    [pipIds, pipSize, state.pipPositions, viewportSize],
  );

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

  const setAllPlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    for (const element of Object.values(videoMap.current)) element.playbackRate = rate;
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
    for (const [otherId, element] of Object.entries(videoMap.current)) {
      if (otherId !== id) void element.play().catch(() => undefined);
    }
    queueMicrotask(() => {
      syncing.current = false;
    });
  }, []);

  const handlePause = useCallback((id: string) => {
    if (syncing.current) return;
    setIsPlaying(false);
    syncing.current = true;
    for (const [otherId, element] of Object.entries(videoMap.current)) if (otherId !== id) element.pause();
    queueMicrotask(() => {
      syncing.current = false;
    });
  }, []);

  const recordPlaybackPosition = useCallback(
    (element: HTMLVideoElement) => {
      if (leader && element !== leader) {
        synchronizeSecondaryVideo(leader, element);
        return;
      }
      if (Number.isFinite(element.currentTime)) setPlaybackPosition(element.currentTime);
    },
    [leader],
  );

  const handlePipDragEnd = useCallback(
    (id: string, _event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const viewport = viewportElement?.getBoundingClientRect();
      if (!viewport) return;
      const clamped = clampPipPosition(
        {
          x: info.point.x - viewport.left - pipSize.width / 2,
          y: info.point.y - viewport.top - pipSize.height / 2,
        },
        { width: viewport.width, height: viewport.height },
        pipSize,
        16,
      );
      const snapped = placePipInNearestCorner(clamped, { width: viewport.width, height: viewport.height }, pipSize, 16);
      dispatch({ type: 'set-pip-position', id, position: snapped });
    },
    [dispatch, pipSize, viewportElement],
  );

  const backLink = sectionId ? (
    <Link
      to="/sections/$sectionId"
      params={{ sectionId }}
      className="focus-visible:ring-ring inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2"
    >
      <ArrowLeft className="size-4" /> Back to lectures
    </Link>
  ) : (
    <Link
      to="/courses"
      className="focus-visible:ring-ring inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2"
    >
      <ArrowLeft className="size-4" /> Back to courses
    </Link>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={viewportRef}
        className="relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-white"
        data-testid="classroom-player"
        data-mode={state.mode}
        tabIndex={-1}
        onPointerMove={controls.onPointerMove}
        onPointerDown={controls.onPointerDown}
        onKeyDown={controls.onKeyDown}
        onFocusCapture={controls.onFocusCapture}
        onBlurCapture={controls.onBlurCapture}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between gap-4 bg-gradient-to-b from-black/90 via-black/65 to-black/20 p-3 transition-opacity duration-300 sm:p-5',
            controls.visible ? 'opacity-100' : 'opacity-0',
          )}
          data-testid="player-top-controls"
          data-visible={controls.visible}
        >
          <div className="pointer-events-auto min-w-0">{backLink}</div>
          <div className="pointer-events-auto flex shrink-0 items-center gap-2">
            <span className="hidden max-w-64 truncate text-right text-sm text-white/80 sm:inline">{lesson.title}</span>
            {properties.positionSeconds > 0 ? (
              <span className="hidden text-xs text-white/60 sm:inline">
                Resuming at {formatDuration(properties.positionSeconds)}
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 hover:text-white"
              aria-label="Use original Echo UI"
              title="Use original Echo UI"
              onClick={onUseOriginal}
            >
              <ArrowLeft className="size-4 rotate-180" />
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          {state.mode === 'grid' ? (
            <motion.div
              layout
              className="absolute inset-4 grid min-h-0 min-w-0"
              data-testid="camera-grid"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, gridLayout.columns)}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${Math.max(1, gridLayout.rows)}, minmax(0, 1fr))`,
                gap: 12,
              }}
            >
              {activeSources.map((source) => (
                <motion.div key={source.id} layout layoutId={`stream-${source.id}`} className="min-h-0 min-w-0">
                  <VideoStream
                    source={source}
                    autoPlay
                    initialPosition={streamInitialPosition}
                    captions={properties.captions}
                    captionsEnabled={captionsEnabled}
                    audioEnabled={state.audioId === source.id}
                    playbackRate={playbackRate}
                    onVideo={bindVideo}
                    onPlay={() => handlePlay(source.id)}
                    onPause={() => handlePause(source.id)}
                    onTimeUpdate={recordPlaybackPosition}
                    onMetadata={(element) => {
                      if (element.videoWidth && element.videoHeight) {
                        setAspectRatios((current) => ({
                          ...current,
                          [source.id]: element.videoWidth / element.videoHeight,
                        }));
                      }
                    }}
                    onActivate={() => dispatchPlayerAction({ type: 'focus', id: source.id })}
                    onSetAudio={() => dispatchPlayerAction({ type: 'set-audio', id: source.id })}
                    showAudioControl
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <FocusLayout
              mainSource={mainSource}
              pipSources={sourceById(sources, pipIds)}
              pipPositions={pipPositions}
              viewportSize={viewportSize}
              pipSize={pipSize}
              initialPosition={streamInitialPosition}
              properties={properties}
              captionsEnabled={captionsEnabled}
              playbackRate={playbackRate}
              audioId={state.audioId}
              bindVideo={bindVideo}
              onPlay={handlePlay}
              onPause={handlePause}
              onTimeUpdate={recordPlaybackPosition}
              onMetadata={(id, element) => {
                if (element.videoWidth && element.videoHeight) {
                  setAspectRatios((current) => ({ ...current, [id]: element.videoWidth / element.videoHeight }));
                }
              }}
              onPromote={(id) => dispatchPlayerAction({ type: 'promote', id })}
              onPipDrop={handlePipDragEnd}
              dragConstraints={constraintsRef}
            />
          )}
        </div>

        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 z-50 bg-gradient-to-t from-black/95 via-black/80 to-black/40 px-3 pt-14 pb-3 transition-opacity duration-300 sm:px-5 sm:pb-5',
            controls.visible ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          data-testid="player-bottom-controls"
          data-visible={controls.visible}
        >
          <div className="pointer-events-none mx-auto flex max-w-5xl flex-col gap-2">
            <div className="pointer-events-none flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="pointer-events-auto text-white hover:bg-white/15 hover:text-white"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlayback}
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" weight="fill" />}
              </Button>
              <span className="text-xs text-white/80 tabular-nums">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
              <div className="pointer-events-auto min-w-0 flex-1">
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
                  onValueCommitted={savePosition}
                />
              </div>
            </div>
            <div className="pointer-events-none flex flex-wrap items-center justify-between gap-2">
              <div className="pointer-events-auto flex items-center gap-2">
                <Tabs
                  value={state.mode}
                  onValueChange={(value) => dispatchPlayerAction({ type: 'set-mode', mode: value as 'grid' | 'focus' })}
                  aria-label="Player mode"
                >
                  <TabsList className="bg-white/10 text-white">
                    <TabsTrigger value="grid" className="text-white/70 data-active:bg-white/20 data-active:text-white">
                      Grid
                    </TabsTrigger>
                    <TabsTrigger value="focus" className="text-white/70 data-active:bg-white/20 data-active:text-white">
                      Focus
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/15 hover:text-white"
                    aria-label={`Streams ${state.selectedIds.length}/${sources.length}`}
                    aria-expanded={streamMenuOpen}
                    onClick={() => setStreamMenuOpen((open) => !open)}
                  >
                    Streams {state.selectedIds.length}/{sources.length} <CaretDown className="size-4" />
                  </Button>
                  {streamMenuOpen ? (
                    <StreamManager
                      sources={sources}
                      selectedIds={state.selectedIds}
                      audioId={state.audioId}
                      onToggle={(id) => dispatchPlayerAction({ type: 'toggle', id })}
                      onSetAudio={(id) => dispatchPlayerAction({ type: 'set-audio', id })}
                      onClose={() => setStreamMenuOpen(false)}
                    />
                  ) : null}
                </div>
              </div>
              <div className="pointer-events-auto flex items-center gap-2">
                <Button
                  variant={captionsEnabled ? 'secondary' : 'ghost'}
                  size="sm"
                  className={captionsEnabled ? '' : 'text-white hover:bg-white/15 hover:text-white'}
                  aria-label={captionsEnabled ? 'Captions on' : 'Captions off'}
                  onClick={() => onCaptionsEnabledChange(!captionsEnabled)}
                >
                  CC
                </Button>
                <select
                  aria-label="Playback speed"
                  value={playbackRate}
                  onChange={(event) => setAllPlaybackRate(Number(event.target.value))}
                  className="h-8 rounded-lg border border-white/20 bg-white/10 px-2 text-xs text-white outline-none"
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <option key={rate} value={rate} className="bg-zinc-900">
                      {rate}x
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function StreamManager({
  sources,
  selectedIds,
  audioId,
  onToggle,
  onSetAudio,
  onClose,
}: {
  sources: readonly PlayerSource[];
  selectedIds: readonly string[];
  audioId: string;
  onToggle: (id: string) => void;
  onSetAudio: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      data-testid="stream-manager"
      className="pointer-events-auto absolute bottom-full left-0 z-[60] mb-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-white/15 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Streams</p>
          <p className="text-xs text-white/60">Choose the cameras shown in the player.</p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-white hover:bg-white/15 hover:text-white"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {sources.map((source) => {
          const selected = selectedIds.includes(source.id);
          const audible = selected && audioId === source.id;
          return (
            <div key={source.id} className="flex items-center gap-1 rounded-lg p-1 hover:bg-white/10">
              <Button
                variant="ghost"
                size="sm"
                className="min-w-0 flex-1 justify-start text-white hover:bg-transparent hover:text-white"
                aria-pressed={selected}
                onClick={() => onToggle(source.id)}
              >
                {selected ? <Check className="size-4 text-emerald-300" /> : <span className="size-4" />}
                <span className="truncate">{source.label}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/15 hover:text-white"
                aria-label={audible ? `${source.label} is audio source` : `Make ${source.label} audio source`}
                disabled={!selected || audible}
                onClick={() => onSetAudio(source.id)}
              >
                {audible ? <SpeakerHigh className="size-4" /> : <SpeakerSlash className="size-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/15 hover:text-white"
                aria-label={`Remove ${source.label}`}
                disabled={!selected || selectedIds.length === 1}
                onClick={() => onToggle(source.id)}
              >
                <Trash className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FocusLayout({
  mainSource,
  pipSources,
  pipPositions,
  viewportSize,
  pipSize,
  initialPosition,
  properties,
  captionsEnabled,
  playbackRate,
  audioId,
  bindVideo,
  onPlay,
  onPause,
  onTimeUpdate,
  onMetadata,
  onPromote,
  onPipDrop,
  dragConstraints,
}: {
  mainSource: PlayerSource | undefined;
  pipSources: readonly PlayerSource[];
  pipPositions: Readonly<Record<string, PipPosition>>;
  viewportSize: { width: number; height: number };
  pipSize: { width: number; height: number };
  initialPosition: number;
  properties: PlayerProperties;
  captionsEnabled: boolean;
  playbackRate: number;
  audioId: string;
  bindVideo: (id: string, element: HTMLVideoElement | null) => void;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onTimeUpdate: (element: HTMLVideoElement) => void;
  onMetadata: (id: string, element: HTMLVideoElement) => void;
  onPromote: (id: string) => void;
  onPipDrop: (id: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  dragConstraints: RefObject<HTMLDivElement | null>;
}) {
  if (!mainSource) return null;
  return (
    <>
      <motion.div
        layout
        layoutId={`stream-${mainSource.id}`}
        className="absolute inset-0 min-h-0 min-w-0 p-3 sm:p-5"
        data-testid="main-stream"
      >
        <VideoStream
          source={mainSource}
          autoPlay
          initialPosition={initialPosition}
          captions={properties.captions}
          captionsEnabled={captionsEnabled}
          audioEnabled={audioId === mainSource.id}
          playbackRate={playbackRate}
          onVideo={bindVideo}
          onPlay={() => onPlay(mainSource.id)}
          onPause={() => onPause(mainSource.id)}
          onTimeUpdate={onTimeUpdate}
          onMetadata={(element) => onMetadata(mainSource.id, element)}
        />
      </motion.div>
      {pipSources.map((source) => {
        const position = pipPositions[source.id] ?? { corner: 'bottom-right', index: 0 };
        const coordinates = getPipCoordinates(position, viewportSize, pipSize, 16, 12);
        return (
          <DraggablePip
            key={source.id}
            source={source}
            coordinates={coordinates}
            pipSize={pipSize}
            onPromote={onPromote}
            onPipDrop={onPipDrop}
            dragConstraints={dragConstraints}
          >
            <VideoStream
              source={source}
              autoPlay
              initialPosition={initialPosition}
              captions={properties.captions}
              captionsEnabled={captionsEnabled}
              audioEnabled={false}
              playbackRate={playbackRate}
              onVideo={bindVideo}
              onPlay={() => onPlay(source.id)}
              onPause={() => onPause(source.id)}
              onTimeUpdate={onTimeUpdate}
              onMetadata={(element) => onMetadata(source.id, element)}
              compact
            />
            <span className="pointer-events-none absolute inset-x-2 bottom-2 truncate rounded bg-black/70 px-2 py-1 text-left text-xs text-white">
              {source.label}
            </span>
          </DraggablePip>
        );
      })}
    </>
  );
}

function DraggablePip({
  source,
  coordinates,
  pipSize,
  onPromote,
  onPipDrop,
  dragConstraints,
  children,
}: {
  source: PlayerSource;
  coordinates: { x: number; y: number };
  pipSize: { width: number; height: number };
  onPromote: (id: string) => void;
  onPipDrop: (id: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  dragConstraints: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const dragControls = useDragControls();
  const dragged = useRef(false);
  const style: CSSProperties = {
    left: coordinates.x,
    top: coordinates.y,
    width: pipSize.width,
    height: pipSize.height,
  };

  return (
    <motion.div
      layout
      layoutId={`stream-${source.id}`}
      className="absolute z-[70] overflow-hidden rounded-xl border-2 border-white/70 bg-black shadow-2xl focus-within:ring-2 focus-within:ring-white"
      style={style}
      data-testid="pip-stream"
      data-stream-id={source.id}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={dragConstraints}
      dragMomentum={false}
      dragElastic={0.08}
      whileDrag={{ scale: 1.03, zIndex: 70 }}
      onPointerDown={(event) => dragControls.start(event)}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={(event, info) => onPipDrop(source.id, event, info)}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        onPromote(source.id);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Promote ${source.label} to main view`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPromote(source.id);
        }
      }}
    >
      {children}
    </motion.div>
  );
}

function VideoStream({
  source,
  autoPlay = false,
  initialPosition,
  captions,
  captionsEnabled,
  audioEnabled,
  playbackRate,
  onVideo,
  onPlay,
  onPause,
  onTimeUpdate,
  onMetadata,
  onActivate,
  onSetAudio,
  showAudioControl = false,
  compact = false,
}: {
  source: PlayerSource;
  autoPlay?: boolean;
  initialPosition: number;
  captions: PlayerProperties['captions'];
  captionsEnabled: boolean;
  audioEnabled: boolean;
  playbackRate: number;
  onVideo: (id: string, element: HTMLVideoElement | null) => void;
  onPlay: () => void;
  onPause: () => void;
  onTimeUpdate: (element: HTMLVideoElement) => void;
  onMetadata: (element: HTMLVideoElement) => void;
  onActivate?: () => void;
  onSetAudio?: () => void;
  showAudioControl?: boolean;
  compact?: boolean;
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
      className={cn(
        'group relative h-full min-h-0 w-full overflow-hidden rounded-xl bg-black',
        compact ? 'rounded-lg' : 'border border-white/15',
      )}
      onClick={onActivate}
    >
      <video
        ref={ref}
        className="h-full w-full object-contain"
        crossOrigin="use-credentials"
        muted={!audioEnabled}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        aria-label={source.label}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={(event) => onTimeUpdate(event.currentTarget)}
        onLoadedMetadata={(event) => {
          event.currentTarget.playbackRate = playbackRate;
          onMetadata(event.currentTarget);
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
      {!compact ? (
        <span className="pointer-events-none absolute top-12 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
          {source.label}
        </span>
      ) : null}
      {showAudioControl && onSetAudio ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-12 right-1 z-10 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white focus:opacity-100"
          aria-label={audioEnabled ? `${source.label} is audio source` : `Make ${source.label} audio source`}
          onClick={(event) => {
            event.stopPropagation();
            onSetAudio();
          }}
        >
          {audioEnabled ? <SpeakerHigh className="size-4" /> : <SpeakerSlash className="size-4" />}
        </Button>
      ) : null}
      {status === 'loading' ? (
        <span className="pointer-events-none absolute right-2 bottom-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
          Loading source…
        </span>
      ) : null}
      {status === 'error' ? (
        <span className="bg-destructive pointer-events-none absolute right-2 bottom-2 rounded px-2 py-1 text-xs text-white">
          Source unavailable
        </span>
      ) : null}
    </div>
  );
}
