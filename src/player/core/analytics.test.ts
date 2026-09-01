import { describe, expect, it, vi } from 'vitest';
import { PlayerAnalytics } from './analytics';

describe('PlayerAnalytics', () => {
  it('reports lifecycle events without duplicate session end', () => {
    const transport = vi.fn();
    const analytics = new PlayerAnalytics(transport, 'context', 'media');
    analytics.begin();
    analytics.beacon(4, [0, 4], 1);
    analytics.end(4);
    analytics.end(4);
    expect(transport.mock.calls.map(([event]) => event.type)).toEqual(['SESSION_BEGIN', 'BEACON', 'SESSION_END']);
  });
});
