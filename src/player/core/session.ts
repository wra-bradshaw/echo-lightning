export type PlayerSessionStopReason = 'ended' | 'stale' | 'disposed';

export interface PlayerSession {
  start(): void;
  stop(reason: PlayerSessionStopReason): void;
  dispose(): void;
}

export type PlayerSessionCallbacks = {
  onStart?: () => void;
  onStop?: (reason: PlayerSessionStopReason) => void;
};

export function createPlayerSession(callbacks: PlayerSessionCallbacks = {}): PlayerSession {
  let started = false;
  let stopped = false;
  return {
    start() {
      if (started || stopped) return;
      started = true;
      callbacks.onStart?.();
    },
    stop(reason) {
      if (stopped) return;
      stopped = true;
      callbacks.onStop?.(reason);
    },
    dispose() {
      if (stopped) return;
      stopped = true;
      callbacks.onStop?.('disposed');
    },
  };
}
