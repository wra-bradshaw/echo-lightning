import { useSyncExternalStore } from 'react';
import type { NavigationStore } from './navigation-store';

export function useNavigationSnapshot(navigation: NavigationStore): string {
  return useSyncExternalStore(navigation.subscribe, navigation.getSnapshot, navigation.getSnapshot);
}
