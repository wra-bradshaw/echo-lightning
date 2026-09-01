import { createHistory, type HistoryLocation, type RouterHistory } from '@tanstack/react-router';
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

function browserLocation(win: Window): HistoryLocation {
  const href = `${win.location.pathname}${win.location.search}${win.location.hash}`;
  const hashIndex = href.indexOf('#');
  const searchIndex = href.indexOf('?');
  const pathEnd =
    hashIndex > 0
      ? searchIndex > 0
        ? Math.min(hashIndex, searchIndex)
        : hashIndex
      : searchIndex > 0
        ? searchIndex
        : href.length;
  const rawState = win.history.state;
  const state =
    rawState && Number.isSafeInteger(rawState.__TSR_index)
      ? rawState
      : { ...(rawState && typeof rawState === 'object' ? rawState : {}), __TSR_index: 0 };
  return {
    href,
    pathname: href.slice(0, pathEnd),
    search: searchIndex > -1 ? href.slice(searchIndex, hashIndex > -1 ? hashIndex : undefined) : '',
    hash: hashIndex > -1 ? href.slice(hashIndex) : '',
    state,
  };
}

export function createLightningHistory(
  win: Window = window,
  onNavigate?: (url: string) => void,
  options: { notifyOnSubscribe?: boolean } = {},
): LightningHistory {
  let disposed = false;
  let snapshot = win.location.href;
  const initialSnapshot = snapshot;
  let previousIndex = Number(win.history.state?.__TSR_index ?? 0);
  const notifyNavigation = () => {
    if (disposed) return;
    const next = win.location.href;
    if (next === snapshot) return;
    snapshot = next;
    onNavigate?.(next);
  };
  const history = createHistory({
    getLocation: () => browserLocation(win),
    getLength: () => win.history.length,
    pushState: (path, state) => win.history.pushState(state, '', path),
    replaceState: (path, state) => win.history.replaceState(state, '', path),
    go: (index) => win.history.go(index),
    back: () => win.history.back(),
    forward: () => win.history.forward(),
    createHref: (path) => path,
    flush: () => undefined,
    destroy: () => {
      win.removeEventListener('popstate', onPopState);
      win.document.removeEventListener(NAVIGATION_EVENT, onBridgeNavigation);
    },
    notifyOnIndexChange: false,
  });
  const unsubscribe = history.subscribe(notifyNavigation);
  const onBridgeNavigation = () => {
    if (disposed) return;
    if (win.location.href !== snapshot) history.notify({ type: 'REPLACE' });
  };
  const onPopState = () => {
    if (disposed) return;
    const nextIndex = Number(win.history.state?.__TSR_index ?? previousIndex);
    const delta = nextIndex - previousIndex;
    previousIndex = nextIndex;
    history.notify(delta < 0 ? { type: 'BACK' } : delta > 0 ? { type: 'FORWARD' } : { type: 'GO', index: delta });
  };
  win.addEventListener('popstate', onPopState);
  win.document.addEventListener(NAVIGATION_EVENT, onBridgeNavigation);

  const adapter = history as LightningHistory;
  const push = history.push.bind(history);
  const replace = history.replace.bind(history);
  const subscribe = history.subscribe.bind(history);
  adapter.subscribe = (listener) => {
    const unsubscribeListener = subscribe(listener);
    if ((options.notifyOnSubscribe ?? true) && snapshot !== initialSnapshot) {
      listener({ location: history.location, action: { type: 'REPLACE' } });
    }
    return unsubscribeListener;
  };
  adapter.push = (path, state, navigateOpts) => {
    if (disposed) return;
    push(path, state, navigateOpts);
    previousIndex = Number(history.location.state.__TSR_index ?? previousIndex);
    notifyNavigation();
  };
  adapter.replace = (path, state, navigateOpts) => {
    if (disposed) return;
    replace(path, state, navigateOpts);
    previousIndex = Number(history.location.state.__TSR_index ?? previousIndex);
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
    history.destroy();
    history.subscribers.clear();
  };
  adapter.destroy = () => adapter.dispose();
  return adapter;
}
