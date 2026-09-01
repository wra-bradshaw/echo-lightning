import { describe, expect, it } from 'vitest';
import { NAVIGATION_EVENT } from '../src/platform/browser/navigation-event';
import { installHistoryBridge } from '../src/entrypoints/history-bridge';

describe('history bridge', () => {
  it('is idempotent and emits payload-free navigation events', () => {
    const events: Event[] = [];
    document.addEventListener(NAVIGATION_EVENT, (event) => events.push(event));
    installHistoryBridge(window);
    installHistoryBridge(window);
    window.history.pushState(null, '', '/bridge-test');
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(Event);
    expect((events[0] as CustomEvent).detail).toBeUndefined();
  });
});
