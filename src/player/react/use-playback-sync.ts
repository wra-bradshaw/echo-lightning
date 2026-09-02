import { useMutation } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { EchoGateway } from '../../domain';
import { createPlaybackPositionQueue, type PlaybackPositionQueue } from '../core/playback-sync';
import { useDocumentVisibility } from './use-document-visibility';

export type PlaybackSyncOptions = {
  gateway: EchoGateway;
  mediaId?: string;
  leader: HTMLMediaElement | null;
  duration?: number;
  enabled?: boolean;
  windowTarget?: Window;
  periodicIntervalMs?: number;
};

export type PlaybackSync = {
  savePosition: () => void;
};

function getEffectiveDuration(
  configuredDuration: number | undefined,
  mediaDuration: number | undefined,
): number | undefined {
  if (Number.isFinite(configuredDuration) && configuredDuration !== undefined && configuredDuration > 0)
    return configuredDuration;
  if (Number.isFinite(mediaDuration) && mediaDuration !== undefined && mediaDuration > 0) return mediaDuration;
  return undefined;
}

function wholeClampedSeconds(position: number | undefined, duration: number | undefined): number | undefined {
  if (position === undefined || !Number.isFinite(position)) return undefined;
  const wholePosition = Math.max(0, Math.floor(position));
  if (!Number.isFinite(duration) || duration === undefined || duration <= 0) return wholePosition;
  return Math.min(wholePosition, Math.floor(duration));
}

export function usePlaybackSync({
  gateway,
  mediaId,
  leader,
  duration,
  enabled = true,
  windowTarget,
  periodicIntervalMs = 10_000,
}: PlaybackSyncOptions): PlaybackSync {
  const leaderRef = useRef(leader);
  const durationRef = useRef(duration);
  const positionRef = useRef<number | undefined>(undefined);
  const queueRef = useRef<PlaybackPositionQueue | undefined>(undefined);
  const mutation = useMutation({
    mutationFn: (seconds: number) => (mediaId ? gateway.savePlayerPosition(mediaId, seconds) : Promise.resolve()),
    retry: false,
  });
  const mutationRef = useRef(mutation.mutateAsync);
  const gatewayRef = useRef(gateway);
  const mediaIdRef = useRef(mediaId);

  useLayoutEffect(() => {
    leaderRef.current = leader;
    durationRef.current = duration;
    mutationRef.current = mutation.mutateAsync;
    gatewayRef.current = gateway;
    mediaIdRef.current = mediaId;
    if (leader && Number.isFinite(leader.currentTime)) positionRef.current = leader.currentTime;
  }, [duration, gateway, leader, mediaId, mutation.mutateAsync]);

  useLayoutEffect(() => {
    if (!enabled || !mediaId) return;
    const queue = createPlaybackPositionQueue((seconds) => mutationRef.current(seconds));
    queueRef.current = queue;
    return () => {
      queue.close();
      if (queueRef.current === queue) queueRef.current = undefined;
    };
  }, [enabled, gateway, mediaId]);

  const saveCurrentPosition = useCallback(() => {
    const currentLeader = leaderRef.current;
    if (!currentLeader || !queueRef.current) return;
    if (Number.isFinite(currentLeader.currentTime)) positionRef.current = currentLeader.currentTime;
    const position = positionRef.current;
    if (position === undefined) return;
    const effectiveDuration = getEffectiveDuration(durationRef.current, currentLeader.duration);
    queueRef.current.save(position, effectiveDuration);
  }, []);

  const saveCurrentPositionBeacon = useCallback(() => {
    const currentLeader = leaderRef.current;
    const currentMediaId = mediaIdRef.current;
    const currentGateway = gatewayRef.current;
    if (!currentLeader || !currentMediaId) return;
    if (Number.isFinite(currentLeader.currentTime)) positionRef.current = currentLeader.currentTime;
    const position = positionRef.current;
    if (position === undefined) return;
    const effectiveDuration = getEffectiveDuration(durationRef.current, currentLeader.duration);
    const seconds = wholeClampedSeconds(position, effectiveDuration);
    if (seconds === undefined) return;
    void currentGateway.savePlayerPosition(currentMediaId, seconds, { keepalive: true }).catch(() => undefined);
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !mediaId || !leader) return;
    const rememberPosition = () => {
      if (Number.isFinite(leader.currentTime)) positionRef.current = leader.currentTime;
    };
    const savePosition = () => saveCurrentPosition();
    leader.addEventListener('timeupdate', rememberPosition);
    leader.addEventListener('pause', savePosition);
    leader.addEventListener('seeked', savePosition);
    return () => {
      leader.removeEventListener('timeupdate', rememberPosition);
      leader.removeEventListener('pause', savePosition);
      leader.removeEventListener('seeked', savePosition);
    };
  }, [enabled, leader, mediaId, saveCurrentPosition]);

  const documentTarget = windowTarget?.document ?? (typeof document !== 'undefined' ? document : undefined);

  const handleVisibilityChange = useCallback(
    (visibilityState: DocumentVisibilityState) => {
      if (enabled && mediaId && visibilityState === 'hidden') saveCurrentPositionBeacon();
    },
    [enabled, mediaId, saveCurrentPositionBeacon],
  );
  useDocumentVisibility({ documentTarget, onChange: handleVisibilityChange });

  useLayoutEffect(() => {
    if (!enabled || !mediaId) return;
    const targetWindow = windowTarget ?? (typeof window === 'undefined' ? undefined : window);
    if (!targetWindow) return;
    const handlePageHide = () => saveCurrentPositionBeacon();
    const handleBeforeUnload = () => saveCurrentPositionBeacon();
    targetWindow.addEventListener('pagehide', handlePageHide, true);
    targetWindow.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      targetWindow.removeEventListener('pagehide', handlePageHide, true);
      targetWindow.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, mediaId, saveCurrentPositionBeacon, windowTarget]);

  useLayoutEffect(() => {
    if (!enabled || !mediaId || !leader) return;
    const targetWindow = windowTarget ?? (typeof window === 'undefined' ? undefined : window);
    if (!targetWindow) return;
    const id = targetWindow.setInterval(() => {
      const currentLeader = leaderRef.current;
      if (!currentLeader || currentLeader.paused) return;
      saveCurrentPosition();
    }, periodicIntervalMs);
    return () => targetWindow.clearInterval(id);
  }, [enabled, leader, mediaId, periodicIntervalMs, saveCurrentPosition, windowTarget]);

  return { savePosition: saveCurrentPosition };
}
