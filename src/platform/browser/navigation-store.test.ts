import { describe, expect, it } from 'vitest';
import { NAVIGATION_EVENT, createNavigationStore } from './navigation-store';

describe('navigation store', () => {
  it('notifies for navigation and stops after disposal', () => {
    const navigation = createNavigationStore(window);
    let calls = 0;
    const unsubscribe = navigation.subscribe(() => calls++);

    navigation.navigate('/lesson/one');
    window.document.dispatchEvent(new Event(NAVIGATION_EVENT));
    expect(calls).toBe(1);
    navigation.dispose();
    window.history.pushState(null, '', '/lesson/two');
    window.document.dispatchEvent(new Event(NAVIGATION_EVENT));
    unsubscribe();
    expect(calls).toBe(1);
  });
});
