import { useEffect, useState } from 'react';
import { injectScript } from 'wxt/utils/inject-script';
import type { PlayerSource } from '../../domain';
import {
  PLAYER_COMMAND_EVENT,
  PLAYER_RUNTIME_READY_EVENT,
  PLAYER_STATUS_EVENT,
  type PlayerStatus,
} from '../core/player-events';

export type VideoSourceStatus = 'idle' | 'loading' | 'ready' | 'error';

let playerScript: Promise<void> | undefined;

function ensurePlayerScript(): Promise<void> {
  playerScript ??= new Promise<void>((resolve, reject) => {
    const ready = () => {
      document.removeEventListener(PLAYER_RUNTIME_READY_EVENT, ready);
      resolve();
    };
    document.addEventListener(PLAYER_RUNTIME_READY_EVENT, ready, { once: true });
    if (document.documentElement.dataset.echoLightningPlayerReady === 'true') {
      ready();
      return;
    }
    void injectScript('/player-runtime.js').then(() => {
      if (document.documentElement.dataset.echoLightningPlayerReady === 'true') ready();
    }, reject);
  });
  return playerScript;
}

export function useVideoSource(
  media: HTMLMediaElement | null,
  source: PlayerSource | undefined,
  initialPosition = 0,
): VideoSourceStatus {
  const [status, setStatus] = useState<VideoSourceStatus>('idle');

  useEffect(() => {
    if (!media || !source) return;
    let active = true;
    const applyInitialPosition = () => {
      if (initialPosition > 0 && Number.isFinite(media.duration) && media.duration > 0) {
        media.currentTime = Math.min(initialPosition, media.duration);
      }
    };
    const onMetadata = () => applyInitialPosition();
    const onStatus = (event: Event) => {
      const value = JSON.parse(String((event as CustomEvent<PlayerStatus>).detail)) as PlayerStatus;
      if (active && value.id === source.id) setStatus(value.status);
    };
    media.addEventListener('loadedmetadata', onMetadata);
    document.addEventListener(PLAYER_STATUS_EVENT, onStatus);
    media.dataset.echoLightningVideo = source.id;
    void ensurePlayerScript()
      .then(() => {
        if (!active) return;
        document.dispatchEvent(
          new CustomEvent(PLAYER_COMMAND_EVENT, {
            detail: JSON.stringify({ action: 'load', id: source.id, source: { src: source.src, type: source.type } }),
          }),
        );
        applyInitialPosition();
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
      media.removeEventListener('loadedmetadata', onMetadata);
      document.removeEventListener(PLAYER_STATUS_EVENT, onStatus);
      document.dispatchEvent(
        new CustomEvent(PLAYER_COMMAND_EVENT, { detail: JSON.stringify({ action: 'destroy', id: source.id }) }),
      );
      delete media.dataset.echoLightningVideo;
      media.removeAttribute('src');
      media.load();
    };
  }, [initialPosition, media, source]);

  return !media || !source ? 'idle' : status === 'idle' ? 'loading' : status;
}
