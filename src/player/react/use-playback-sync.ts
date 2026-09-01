import { useMutation } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { EchoGateway } from '../../domain';
import { createPlaybackPositionQueue, type PlaybackPositionQueue } from '../core/playback-sync';

export type PlaybackSyncOptions = {
  gateway: EchoGateway;
  mediaId?: string;
  leader: HTMLMediaElement | null;
  duration?: number;
  enabled?: boolean;
  windowTarget?: Window;
};

export type PlaybackSync = {
  savePosition: () => void;
};

export function usePlaybackSync({
  gateway,
  mediaId,
  leader,
  duration,
  enabled = true,
  windowTarget,
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

  useLayoutEffect(() => {
    leaderRef.current = leader;
    durationRef.current = duration;
    mutationRef.current = mutation.mutateAsync;
    if (leader && Number.isFinite(leader.currentTime)) positionRef.current = leader.currentTime;
  }, [duration, leader, mutation.mutateAsync]);

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
    const configuredDuration = durationRef.current;
    const mediaDuration = currentLeader.duration;
    const effectiveDuration =
      Number.isFinite(configuredDuration) && configuredDuration !== undefined && configuredDuration > 0
        ? configuredDuration
        : Number.isFinite(mediaDuration) && mediaDuration > 0
          ? mediaDuration
          : undefined;
    queueRef.current.save(position, effectiveDuration);
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !mediaId || !leader) return;
    const rememberPosition = () => {
      if (Number.isFinite(leader.currentTime)) positionRef.current = leader.currentTime;
    };
    const savePosition = () => saveCurrentPosition();
    const page = windowTarget ?? (typeof window === 'undefined' ? undefined : window);
    leader.addEventListener('timeupdate', rememberPosition);
    leader.addEventListener('pause', savePosition);
    leader.addEventListener('seeked', savePosition);
    page?.addEventListener('pagehide', savePosition, true);
    return () => {
      leader.removeEventListener('timeupdate', rememberPosition);
      leader.removeEventListener('pause', savePosition);
      leader.removeEventListener('seeked', savePosition);
      page?.removeEventListener('pagehide', savePosition, true);
    };
  }, [enabled, leader, mediaId, saveCurrentPosition, windowTarget]);

  return { savePosition: saveCurrentPosition };
}
