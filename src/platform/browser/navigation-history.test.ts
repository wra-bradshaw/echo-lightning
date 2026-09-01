import { describe, expect, it, vi } from 'vitest';
import { NAVIGATION_EVENT } from './navigation-store';
import { createLightningHistory } from './navigation-history';

describe('Lightning history adapter', () => {
  it('bridges pushState, replaceState, popstate, and Echo events with one callback', async () => {
    window.history.replaceState(null, '', '/');
    const onNavigate = vi.fn();
    const history = createLightningHistory(window, onNavigate);
    history.push('/courses');
    history.flush();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    window.history.replaceState(null, '', '/sections/one');
    window.document.dispatchEvent(new Event(NAVIGATION_EVENT));
    expect(onNavigate).toHaveBeenCalledTimes(2);
    window.history.pushState(null, '', '/classrooms/two');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onNavigate).toHaveBeenCalledTimes(3);
    history.dispose();
    window.history.pushState(null, '', '/courses');
    window.document.dispatchEvent(new Event(NAVIGATION_EVENT));
    expect(onNavigate).toHaveBeenCalledTimes(3);
  });

  it('supports navigation snapshots and idempotent disposal', () => {
    window.history.replaceState(null, '', '/');
    const history = createLightningHistory(window);
    expect(history.getSnapshot()).toBe(window.location.href);
    history.navigate('/lesson/one', { replace: true });
    expect(new URL(history.getSnapshot()).pathname).toBe('/lesson/one');
    history.dispose();
    history.dispose();
  });
});
