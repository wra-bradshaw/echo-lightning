export const NAVIGATION_EVENT = 'echo-lightning:navigation';

export interface NavigationStore {
  getSnapshot(): string;
  subscribe(listener: () => void): () => void;
  navigate(url: string | URL, options?: { replace?: boolean }): void;
  dispose(): void;
}

export function createNavigationStore(win: Window = window, onNavigate?: (url: string) => void): NavigationStore {
  let snapshot = win.location.href;
  let disposed = false;
  const listeners = new Set<() => void>();
  const update = () => {
    if (disposed) return;
    const next = win.location.href;
    if (next === snapshot) return;
    snapshot = next;
    onNavigate?.(snapshot);
    for (const listener of listeners) listener();
  };
  const onPopState = () => update();
  const onNavigation = () => update();
  win.addEventListener('popstate', onPopState);
  win.document.addEventListener(NAVIGATION_EVENT, onNavigation);
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    navigate(url, options) {
      if (disposed) return;
      const next = new URL(url.toString(), win.location.href);
      if (options?.replace) win.history.replaceState(null, '', next);
      else win.history.pushState(null, '', next);
      update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      win.removeEventListener('popstate', onPopState);
      win.document.removeEventListener(NAVIGATION_EVENT, onNavigation);
    },
  };
}
