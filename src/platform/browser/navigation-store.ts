import { createLightningHistory } from './navigation-history';
import type { LightningHistory } from './navigation-history';

export { NAVIGATION_EVENT } from './navigation-event';

export interface NavigationStore {
  getSnapshot(): string;
  subscribe(listener: () => void): () => void;
  navigate(url: string | URL, options?: { replace?: boolean }): void;
  dispose(): void;
}

export { createLightningHistory };
export function createNavigationStore(win: Window = window, onNavigate?: (url: string) => void): LightningHistory {
  return createLightningHistory(win, onNavigate);
}
