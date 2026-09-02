import { ArrowLeft, CaretDown, Check, Pause, Play, SpeakerHigh, SpeakerSlash, Trash, X } from '@phosphor-icons/react';
import { MotionConfig, motion, type PanInfo } from 'motion/react';
import { Link } from '@tanstack/react-router';
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { usePipDrag } from './use-pip-drag';
import { usePipResize } from './use-pip-resize';
import type { EchoGateway, PlayerProperties, PlayerSource, SyllabusItem } from '../../domain';
import { calculateGridLayout } from '../core/grid-layout';
import {
  clampPipPosition,
  getPipCoordinates,
  placePipInNearestCorner,
  placePipStacks,
  type PipPosition,
  type PipSize,
} from '../core/pip-placement';
import {
  MAX_PLAYER_VOLUME,
  PLAYER_VOLUME_SLIDER_STEP,
  playerVolumeToSliderValue,
  sliderValueToPlayerVolume,
} from '../core/player-volume';
import type { PlayerHotkeyAction } from '../core/player-hotkeys';
import type { PlayerAction } from '../core/player-state';
import { synchronizeSecondaryVideo } from '../core/media-sync';
import { useCaptionTracks } from './use-caption-tracks';
import { useControlVisibility } from './use-control-visibility';
import { useKeepPlaying } from './use-keep-playing';
import { useElementSize } from './use-element-size';
import { useMediaClock } from './use-media-clock';
import { useMediaVolume } from './use-media-volume';
import { usePlayerHotkeys } from './use-player-hotkeys';
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
  savedPlayerState?: import('../core/player-state').PlayerState;
  onPlayerStateChange?: (state: import('../core/player-state').PlayerState) => void;
  savedPipSize?: import('../core/pip-placement').PipSize;
  onPipSizeChange?: (size: import('../core/pip-placement').PipSize) => void;
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

function speedToSlider(speed: number): number {
  const clamped = Math.min(10, Math.max(0.5, speed));
  return Math.sqrt((clamped - 0.5) / 9.5) * 100;
}

function sliderToSpeed(slider: number): number {
  const t = Math.min(100, Math.max(0, slider)) / 100;
  const speed = 0.5 + t * t * 9.5;
  return Math.round(speed * 8) / 8;
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
  savedPlayerState,
  onPlayerStateChange,
  savedPipSize,
  onPipSizeChange,
  captionsEnabled,
  onCaptionsEnabledChange,
}: PlayerViewportProps) {
  const sources = properties.sources;
  const sourceIds = useMemo(() => sources.map((source) => source.id), [sources]);
  const { state, dispatch } = usePlayerState(
    sourceIds,
    savedSelectedIds,
    onSelectedIdsChange,
    savedPlayerState,
    onPlayerStateChange,
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackPosition, setPlaybackPosition] = useState(properties.positionSeconds);
  const [videoElements, setVideoElements] = useState<VideoElements>({});
  const videoMap = useRef<VideoElements>({});
  const syncing = useRef(false);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [streamMenuOpen, setStreamMenuOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const { ref: sizeRef, element: viewportElement, size: viewportSize } = useElementSize<HTMLDivElement>();
  const viewportRef = useCallback(
    (element: HTMLDivElement | null) => {
      playerRef.current = element;
      sizeRef(element);
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
  const handlePromote = useCallback(
    (id: string) => {
      const wasPlaying = isPlaying;
      dispatchPlayerAction({ type: 'promote', id });
      if (wasPlaying) {
        setIsPlaying(true);
        requestAnimationFrame(() => {
          for (const el of Object.values(videoMap.current)) void el.play().catch(() => setIsPlaying(false));
        });
      }
    },
    [dispatchPlayerAction, isPlaying],
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
  const [pipSizeOverride, setPipSizeOverride] = useState<PipSize | null>(() => savedPipSize ?? null);
  useLayoutEffect(() => {
    setPipSizeOverride(savedPipSize ?? null);
  }, [savedPipSize]);
  const defaultPipSize = useMemo(
    () => ({
      width: Math.min(320, Math.max(148, viewportSize.width * 0.22)),
      height: Math.min(180, Math.max(83, (viewportSize.width * 0.22 * 9) / 16)),
    }),
    [viewportSize.width],
  );
  const pipSize = useMemo(() => {
    if (!pipSizeOverride) return defaultPipSize;
    const maxWidthByViewport = Math.max(148, viewportSize.width - 32);
    const maxHeightByViewport = Math.max(83, viewportSize.height - 32);
    const maxWidthByHeight = (maxHeightByViewport * 16) / 9;
    const maxWidth = Math.min(480, maxWidthByViewport, maxWidthByHeight);
    const width = Math.max(148, Math.min(maxWidth, pipSizeOverride.width));
    const height = (width * 9) / 16;
    return { width, height };
  }, [defaultPipSize, pipSizeOverride, viewportSize.height, viewportSize.width]);
  const handlePipResize = useCallback(
    (size: PipSize) => {
      setPipSizeOverride(size);
      onPipSizeChange?.(size);
    },
    [onPipSizeChange],
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

  const getManagedVideoElements = useCallback(() => {
    const currentElements = playerRef.current ? Array.from(playerRef.current.querySelectorAll('video')) : [];
    const registeredElements = Object.values(videoMap.current);
    return [...currentElements, ...registeredElements.filter((element) => !currentElements.includes(element))];
  }, []);

  const getCurrentLeaderVideo = useCallback(() => {
    const leaderId = state.mode === 'focus' ? state.mainId : state.audioId;
    const managedElements = getManagedVideoElements();
    return managedElements.find((element) => element.dataset.streamId === leaderId) ?? managedElements[0] ?? leader;
  }, [getManagedVideoElements, leader, state.audioId, state.mainId, state.mode]);

  const setAllCurrentTime = useCallback(
    (time: number) => {
      if (!Number.isFinite(time)) return;
      for (const element of getManagedVideoElements()) {
        if (Math.abs(element.currentTime - time) > 0.05) element.currentTime = time;
      }
    },
    [getManagedVideoElements],
  );

  const setAllPlaybackRate = useCallback(
    (rate: number) => {
      setPlaybackRate(rate);
      for (const element of getManagedVideoElements()) element.playbackRate = rate;
    },
    [getManagedVideoElements],
  );

  const setAllVolume = useCallback(
    (nextVolume: number) => {
      const next = Number.isFinite(nextVolume) ? Math.min(MAX_PLAYER_VOLUME, Math.max(0, nextVolume)) : 0;
      setVolume(next);
      const nativeVolume = Math.min(1, next);
      for (const element of getManagedVideoElements()) element.volume = nativeVolume;
    },
    [getManagedVideoElements],
  );

  const togglePlayback = useCallback(() => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    for (const element of getManagedVideoElements()) {
      if (nextPlaying) void element.play().catch(() => setIsPlaying(false));
      else element.pause();
    }
  }, [getManagedVideoElements, isPlaying]);

  const handlePlay = useCallback(
    (id: string) => {
      setIsPlaying(true);
      if (syncing.current) return;
      syncing.current = true;
      for (const element of getManagedVideoElements()) {
        if (element.dataset.streamId !== id) void element.play().catch(() => undefined);
      }
      queueMicrotask(() => {
        syncing.current = false;
      });
    },
    [getManagedVideoElements],
  );

  const handlePause = useCallback(
    (id: string) => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        const target = getManagedVideoElements().find((element) => element.dataset.streamId === id);
        if (target && target.paused) void target.play().catch(() => undefined);
        return;
      }
      if (syncing.current) return;
      setIsPlaying(false);
      syncing.current = true;
      for (const element of getManagedVideoElements()) if (element.dataset.streamId !== id) element.pause();
      queueMicrotask(() => {
        syncing.current = false;
      });
    },
    [getManagedVideoElements],
  );

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
      const position = pipPositions[id] ?? { corner: 'bottom-right' as const, index: 0 };
      const initial = getPipCoordinates(position, { width: viewport.width, height: viewport.height }, pipSize, 16, 12);
      const nextPoint = {
        x: initial.x + info.offset.x,
        y: initial.y + info.offset.y,
      };
      const clamped = clampPipPosition(nextPoint, { width: viewport.width, height: viewport.height }, pipSize, 16);
      const snapped = placePipInNearestCorner(clamped, { width: viewport.width, height: viewport.height }, pipSize, 16);
      dispatch({ type: 'set-pip-position', id, position: snapped });
    },
    [dispatch, pipPositions, pipSize, viewportElement],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    const player = playerRef.current;
    if (player?.requestFullscreen) void player.requestFullscreen().catch(() => undefined);
  }, []);

  const togglePictureInPicture = useCallback(() => {
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => undefined);
      return;
    }
    const currentLeader = getCurrentLeaderVideo();
    if (currentLeader?.requestPictureInPicture) void currentLeader.requestPictureInPicture().catch(() => undefined);
  }, [getCurrentLeaderVideo]);

  const seekPlaybackPosition = useCallback(
    (nextPosition: number) => {
      const upperBound = duration > 0 ? duration : Number.POSITIVE_INFINITY;
      setAllCurrentTime(Math.min(upperBound, Math.max(0, nextPosition)));
    },
    [duration, setAllCurrentTime],
  );

  const handlePlayerHotkey = useCallback(
    (action: PlayerHotkeyAction) => {
      const currentLeader = getCurrentLeaderVideo();
      const position =
        currentLeader && Number.isFinite(currentLeader.currentTime)
          ? currentLeader.currentTime
          : Number.isFinite(currentTime)
            ? currentTime
            : 0;
      switch (action.type) {
        case 'seek':
          seekPlaybackPosition(position + action.seconds);
          break;
        case 'seek-to':
          seekPlaybackPosition(action.seconds);
          break;
        case 'set-playback-rate':
          setAllPlaybackRate(action.rate);
          break;
        case 'set-volume':
          setAllVolume(action.volume);
          setIsMuted(false);
          break;
        case 'step-frame':
          seekPlaybackPosition(position + action.seconds);
          break;
        case 'toggle-captions':
          onCaptionsEnabledChange(!captionsEnabled);
          break;
        case 'toggle-fullscreen':
          toggleFullscreen();
          break;
        case 'toggle-mute':
          setIsMuted((muted) => !muted);
          break;
        case 'toggle-picture-in-picture':
          togglePictureInPicture();
          break;
        case 'toggle-playback':
          togglePlayback();
          break;
      }
    },
    [
      captionsEnabled,
      currentTime,
      getCurrentLeaderVideo,
      onCaptionsEnabledChange,
      setAllPlaybackRate,
      setAllVolume,
      seekPlaybackPosition,
      toggleFullscreen,
      togglePictureInPicture,
      togglePlayback,
    ],
  );

  usePlayerHotkeys({
    duration,
    isPlaying,
    onAction: handlePlayerHotkey,
    playbackRate,
    target: playerRef,
    volume,
  });

  useKeepPlaying({ isPlaying, getVideoElements: getManagedVideoElements });

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
        onPointerDown={(event) => {
          controls.onPointerDown(event);
          playerRef.current?.focus();
        }}
        onKeyDown={controls.onKeyDown}
        onFocusCapture={controls.onFocusCapture}
        onBlurCapture={controls.onBlurCapture}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 z-[80] flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 transition-opacity duration-300 sm:p-5',
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
            <div
              className="absolute inset-4 grid min-h-0 min-w-0"
              data-testid="camera-grid"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, gridLayout.columns)}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${Math.max(1, gridLayout.rows)}, minmax(0, 1fr))`,
                gap: 12,
              }}
            >
              {activeSources.map((source) => (
                <div key={source.id} className="min-h-0 min-w-0">
                  <VideoStream
                    source={source}
                    autoPlay
                    initialPosition={streamInitialPosition}
                    captions={properties.captions}
                    captionsEnabled={captionsEnabled}
                    audioEnabled={state.audioId === source.id && !isMuted}
                    volume={volume}
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
                    onVideoClick={togglePlayback}
                    onSetAudio={() => dispatchPlayerAction({ type: 'set-audio', id: source.id })}
                    showAudioControl
                    controlsVisible={controls.visible}
                  />
                </div>
              ))}
            </div>
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
              isMuted={isMuted}
              volume={volume}
              bindVideo={bindVideo}
              onPlay={handlePlay}
              onPause={handlePause}
              onTimeUpdate={recordPlaybackPosition}
              onVideoClick={togglePlayback}
              onPromote={handlePromote}
              onMetadata={(id, element) => {
                if (element.videoWidth && element.videoHeight) {
                  setAspectRatios((current) => ({ ...current, [id]: element.videoWidth / element.videoHeight }));
                }
              }}
              onPipDrop={handlePipDragEnd}
              onResize={handlePipResize}
              controlsVisible={controls.visible}
            />
          )}
        </div>

        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 z-[80] bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-12 pb-4 transition-opacity duration-300 sm:px-5 sm:pb-5',
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
              <div
                className="group/volume pointer-events-auto flex shrink-0 items-center"
                data-testid="player-volume-control"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto text-white hover:bg-white/15 hover:text-white"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  onClick={() => setIsMuted((muted) => !muted)}
                >
                  {isMuted ? <SpeakerSlash className="size-5" /> : <SpeakerHigh className="size-5" />}
                </Button>
                <div
                  className="grid w-36 grid-cols-[1fr] overflow-hidden opacity-0 transition-opacity delay-500 duration-200 group-hover/volume:opacity-100 group-hover/volume:delay-0"
                  data-testid="player-volume-slider-reveal"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Slider
                      aria-label="Volume"
                      data-testid="player-volume-slider"
                      value={[playerVolumeToSliderValue(volume)]}
                      min={0}
                      max={playerVolumeToSliderValue(1)}
                      step={PLAYER_VOLUME_SLIDER_STEP}
                      onValueChange={(value) => {
                        const next = Array.isArray(value) ? Number(value[0]) : Number(value);
                        if (Number.isFinite(next)) {
                          setAllVolume(sliderValueToPlayerVolume(next));
                          setIsMuted(false);
                        }
                      }}
                    />
                    <span
                      data-testid="player-volume-value"
                      className="w-12 shrink-0 text-right text-xs text-white/80 tabular-nums"
                    >
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              </div>
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
                    <TabsTrigger
                      value="grid"
                      className="text-white/70 hover:bg-white/10 hover:text-white data-active:bg-white/20 data-active:text-white"
                    >
                      Grid
                    </TabsTrigger>
                    <TabsTrigger
                      value="focus"
                      className="text-white/70 hover:bg-white/10 hover:text-white data-active:bg-white/20 data-active:text-white"
                    >
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
                <div
                  className="group/speed pointer-events-auto flex shrink-0 items-center"
                  data-testid="player-speed-control"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="pointer-events-auto text-white hover:bg-white/15 hover:text-white"
                    aria-label={`Playback speed ${playbackRate}x`}
                  >
                    {Number.isInteger(playbackRate)
                      ? `${playbackRate}x`
                      : `${playbackRate.toFixed(3).replace(/\.?0+$/, '')}x`}
                  </Button>
                  <div
                    className="grid w-36 grid-cols-[1fr] overflow-hidden opacity-0 transition-opacity delay-500 duration-200 group-hover/speed:opacity-100 group-hover/speed:delay-0"
                    data-testid="player-speed-slider-reveal"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Slider
                        aria-label="Playback speed"
                        data-testid="player-speed-slider"
                        value={[Math.min(speedToSlider(1), speedToSlider(playbackRate))]}
                        min={0}
                        max={speedToSlider(1)}
                        step={1}
                        onValueChange={(value) => {
                          const next = Array.isArray(value) ? Number(value[0]) : Number(value);
                          if (Number.isFinite(next)) setAllPlaybackRate(sliderToSpeed(next));
                        }}
                      />
                      <span
                        data-testid="player-speed-value"
                        className="w-12 shrink-0 text-right text-xs text-white/80 tabular-nums"
                      >
                        {Number.isInteger(playbackRate)
                          ? `${playbackRate}x`
                          : `${playbackRate.toFixed(3).replace(/\.?0+$/, '')}x`}
                      </span>
                    </div>
                  </div>
                </div>
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
  isMuted,
  volume,
  bindVideo,
  onPlay,
  onPause,
  onTimeUpdate,
  onVideoClick,
  onPromote,
  onMetadata,
  onPipDrop,
  onResize,
  controlsVisible,
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
  isMuted: boolean;
  volume: number;
  bindVideo: (id: string, element: HTMLVideoElement | null) => void;
  onPlay: (id: string) => void;
  onPause: (id: string) => void;
  onTimeUpdate: (element: HTMLVideoElement) => void;
  onVideoClick: () => void;
  onPromote: (id: string) => void;
  onMetadata: (id: string, element: HTMLVideoElement) => void;
  onPipDrop: (id: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  onResize: (size: PipSize) => void;
  controlsVisible: boolean;
}) {
  if (!mainSource) return null;
  return (
    <>
      <div className="absolute inset-0 min-h-0 min-w-0 p-3 sm:p-5" data-testid="main-stream">
        <VideoStream
          source={mainSource}
          autoPlay
          initialPosition={initialPosition}
          captions={properties.captions}
          captionsEnabled={captionsEnabled}
          audioEnabled={audioId === mainSource.id && !isMuted}
          volume={volume}
          playbackRate={playbackRate}
          onVideo={bindVideo}
          onPlay={() => onPlay(mainSource.id)}
          onPause={() => onPause(mainSource.id)}
          onTimeUpdate={onTimeUpdate}
          onVideoClick={onVideoClick}
          onMetadata={(element) => onMetadata(mainSource.id, element)}
          controlsVisible={controlsVisible}
        />
      </div>
      {pipSources.map((source) => {
        const position = pipPositions[source.id] ?? { corner: 'bottom-right', index: 0 };
        const coordinates = getPipCoordinates(position, viewportSize, pipSize, 16, 12);
        return (
          <DraggablePip
            key={source.id}
            source={source}
            coordinates={coordinates}
            pipSize={pipSize}
            viewportSize={viewportSize}
            position={position}
            onPromote={onPromote}
            onPipDrop={onPipDrop}
            onResize={onResize}
          >
            <VideoStream
              source={source}
              autoPlay
              initialPosition={initialPosition}
              captions={properties.captions}
              captionsEnabled={captionsEnabled}
              audioEnabled={false}
              volume={volume}
              playbackRate={playbackRate}
              onVideo={bindVideo}
              onPlay={() => onPlay(source.id)}
              onPause={() => onPause(source.id)}
              onTimeUpdate={onTimeUpdate}
              onMetadata={(element) => onMetadata(source.id, element)}
              compact
              controlsVisible={controlsVisible}
            />
            <span
              data-testid="camera-label"
              className={cn(
                'pointer-events-none absolute inset-x-2 bottom-2 truncate rounded bg-black/70 px-2 py-1 text-left text-xs text-white transition-opacity duration-300',
                controlsVisible ? 'opacity-100' : 'opacity-0',
              )}
            >
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
  viewportSize,
  position,
  onPromote,
  onPipDrop,
  onResize,
  children,
}: {
  source: PlayerSource;
  coordinates: { x: number; y: number };
  pipSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  position: PipPosition;
  onPromote: (id: string) => void;
  onPipDrop: (id: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  onResize: (size: PipSize) => void;
  children: React.ReactNode;
}) {
  const { isDragging, displayCoordinates, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    usePipDrag(coordinates, pipSize, viewportSize, onPipDrop, source.id, () => onPromote(source.id));
  const resizeHandle = usePipResize(pipSize, viewportSize, position.corner, onResize);
  const handleConfig = {
    'top-left': {
      className: 'right-0 bottom-0 cursor-nwse-resize items-end justify-end',
      border: 'border-r-2 border-b-2',
    },
    'top-right': {
      className: 'left-0 bottom-0 cursor-nesw-resize items-end justify-start',
      border: 'border-l-2 border-b-2',
    },
    'bottom-left': {
      className: 'right-0 top-0 cursor-nesw-resize items-start justify-end',
      border: 'border-r-2 border-t-2',
    },
    'bottom-right': {
      className: 'left-0 top-0 cursor-nwse-resize items-start justify-start',
      border: 'border-l-2 border-t-2',
    },
  }[position.corner];

  const style: CSSProperties = {
    left: displayCoordinates.x,
    top: displayCoordinates.y,
    width: pipSize.width,
    height: pipSize.height,
  };

  return (
    <motion.div
      layout={!isDragging}
      className="absolute z-[70] overflow-hidden rounded-xl border-2 border-white/70 bg-black shadow-2xl focus-within:ring-2 focus-within:ring-white"
      style={style}
      data-testid="pip-stream"
      data-stream-id={source.id}
      animate={isDragging ? { scale: 1.03, zIndex: 70 } : { scale: 1, zIndex: 70 }}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
    >
      {children}
      <div
        data-testid="pip-resize-handle"
        className={cn('absolute z-10 flex h-6 w-6 touch-none p-1', handleConfig.className)}
        onPointerDown={resizeHandle.onPointerDown}
        onPointerMove={resizeHandle.onPointerMove}
        onPointerUp={resizeHandle.onPointerUp}
        onLostPointerCapture={resizeHandle.onLostPointerCapture}
      >
        <div className={cn('h-3 w-3 rounded-sm border-white/80 opacity-70', handleConfig.border)} />
      </div>
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
  volume,
  playbackRate,
  onVideo,
  onPlay,
  onPause,
  onTimeUpdate,
  onMetadata,
  onVideoClick,
  onSetAudio,
  showAudioControl = false,
  compact = false,
  controlsVisible = true,
}: {
  source: PlayerSource;
  autoPlay?: boolean;
  initialPosition: number;
  captions: PlayerProperties['captions'];
  captionsEnabled: boolean;
  audioEnabled: boolean;
  volume: number;
  playbackRate: number;
  onVideo: (id: string, element: HTMLVideoElement | null) => void;
  onPlay: () => void;
  onPause: () => void;
  onTimeUpdate: (element: HTMLVideoElement) => void;
  onMetadata: (element: HTMLVideoElement) => void;
  onVideoClick?: () => void;
  onSetAudio?: () => void;
  showAudioControl?: boolean;
  compact?: boolean;
  controlsVisible?: boolean;
}) {
  const [media, setMedia] = useState<HTMLVideoElement | null>(null);
  const status = useVideoSource(media, source, initialPosition);
  useCaptionTracks(media, captionsEnabled);
  useMediaVolume(media, volume);
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
        data-stream-id={source.id}
        onClick={onVideoClick}
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
        <span
          data-testid="camera-label"
          className={cn(
            'pointer-events-none absolute top-12 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
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
