export type PlaybackPositionQueueOptions = {
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
};

export type PlaybackPositionQueue = {
  save(position: number, duration?: number): void;
  close(): void;
};

type PositionWriter = (seconds: number) => Promise<void>;

function wholeClampedSeconds(position: number, duration: number | undefined): number | undefined {
  if (!Number.isFinite(position)) return undefined;
  const wholePosition = Math.max(0, Math.floor(position));
  if (!Number.isFinite(duration) || duration === undefined || duration <= 0) return wholePosition;
  return Math.min(wholePosition, Math.floor(duration));
}

export function createPlaybackPositionQueue(
  write: PositionWriter,
  options: PlaybackPositionQueueOptions = {},
): PlaybackPositionQueue {
  const retryBaseDelayMs = Math.max(1, options.retryBaseDelayMs ?? 250);
  const retryMaxDelayMs = Math.max(retryBaseDelayMs, options.retryMaxDelayMs ?? 8_000);
  let closed = false;
  let inFlight = false;
  let pending: number | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt = 0;

  const scheduleRetry = () => {
    if (closed || retryTimer !== undefined) return;
    const delay = Math.min(retryMaxDelayMs, retryBaseDelayMs * 2 ** retryAttempt);
    retryAttempt = Math.min(retryAttempt + 1, 30);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void flush();
    }, delay);
  };

  const flush = async (): Promise<void> => {
    if (closed || inFlight || pending === undefined) return;
    const seconds = pending;
    pending = undefined;
    inFlight = true;
    try {
      await write(seconds);
      retryAttempt = 0;
    } catch {
      if (!closed && pending === undefined) pending = seconds;
      scheduleRetry();
    } finally {
      inFlight = false;
      if (!closed && pending !== undefined && retryTimer === undefined) void flush();
    }
  };

  return {
    save(position, duration) {
      if (closed) return;
      const seconds = wholeClampedSeconds(position, duration);
      if (seconds === undefined) return;
      pending = seconds;
      retryAttempt = 0;
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      if (!inFlight) void flush();
    },
    close() {
      if (closed) return;
      closed = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      retryTimer = undefined;
      pending = undefined;
    },
  };
}
