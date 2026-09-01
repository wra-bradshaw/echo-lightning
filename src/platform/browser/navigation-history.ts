import { createBrowserHistory, type RouterHistory } from '@tanstack/react-router';
import { NAVIGATION_EVENT } from './navigation-event';

export interface LightningHistory extends RouterHistory {
  getSnapshot(): string;
  navigate(url: string | URL, options?: { replace?: boolean }): void;
  dispose(): void;
}

function relativeHref(url: string | URL, base: string): string {
  const resolved = new URL(url.toString(), base);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function createLightningHistory(win: Window = window, onNavigate?: (url: string) => void): LightningHistory {
  const history = createBrowserHistory({ window: win });
  let disposed = false;
  let snapshot = win.location.href;
  const notifyNavigation = () => {
    if (disposed) return;
    const next = win.location.href;
    if (next === snapshot) return;
    snapshot = next;
    onNavigate?.(next);
  };
  const unsubscribe = history.subscribe(notifyNavigation);
  const onBridgeNavigation = () => {
    if (disposed) return;
    if (win.location.href !== snapshot) history.notify({ type: 'REPLACE' });
  };
  win.document.addEventListener(NAVIGATION_EVENT, onBridgeNavigation);

  const adapter = history as LightningHistory;
  const push = history.push.bind(history);
  const replace = history.replace.bind(history);
  const destroy = history.destroy.bind(history);
  const subscribe = history.subscribe.bind(history);
  adapter.subscribe = (listener) => {
    const unsubscribeListener = subscribe(listener);
    listener({ location: history.location, action: { type: 'REPLACE' } });
    return unsubscribeListener;
  };
  adapter.push = (path, state, navigateOpts) => {
    if (disposed) return;
    push(path, state, navigateOpts);
    history.flush();
    notifyNavigation();
  };
  adapter.replace = (path, state, navigateOpts) => {
    if (disposed) return;
    replace(path, state, navigateOpts);
    history.flush();
    notifyNavigation();
  };
  adapter.getSnapshot = () => snapshot;
  adapter.navigate = (url, options) => {
    if (disposed) return;
    const path = relativeHref(url, win.location.href);
    if (options?.replace) adapter.replace(path);
    else adapter.push(path);
  };
  adapter.dispose = () => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    win.document.removeEventListener(NAVIGATION_EVENT, onBridgeNavigation);
    destroy();
    history.subscribers.clear();
  };
  adapter.destroy = () => adapter.dispose();
  return adapter;
}
