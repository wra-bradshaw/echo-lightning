export type PlayerAnalyticsEvent =
  | { type: 'SESSION_BEGIN'; sessionId: string; contextId: string; mediaId: string }
  | { type: 'SESSION_END'; sessionId: string; contextId: string; mediaId: string; position: number }
  | { type: 'SESSION_STALE'; sessionId: string; contextId: string; mediaId: string }
  | {
      type: 'BEACON';
      sessionId: string;
      contextId: string;
      mediaId: string;
      position: number;
      played: number[];
      playbackRate: number;
    };

export type AnalyticsTransport = (event: PlayerAnalyticsEvent) => Promise<void> | void;

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class PlayerAnalytics {
  private ended = false;
  readonly sessionId = createSessionId();

  constructor(
    private readonly transport: AnalyticsTransport,
    private readonly contextId: string,
    private readonly mediaId: string,
  ) {}

  begin(): Promise<void> | void {
    return this.transport({
      type: 'SESSION_BEGIN',
      sessionId: this.sessionId,
      contextId: this.contextId,
      mediaId: this.mediaId,
    });
  }

  beacon(position: number, played: number[], playbackRate: number): Promise<void> | void {
    if (this.ended) return;
    return this.transport({
      type: 'BEACON',
      sessionId: this.sessionId,
      contextId: this.contextId,
      mediaId: this.mediaId,
      position,
      played,
      playbackRate,
    });
  }

  end(position: number): Promise<void> | void {
    if (this.ended) return;
    this.ended = true;
    return this.transport({
      type: 'SESSION_END',
      sessionId: this.sessionId,
      contextId: this.contextId,
      mediaId: this.mediaId,
      position,
    });
  }

  stale(): Promise<void> | void {
    if (this.ended) return;
    this.ended = true;
    return this.transport({
      type: 'SESSION_STALE',
      sessionId: this.sessionId,
      contextId: this.contextId,
      mediaId: this.mediaId,
    });
  }
}
