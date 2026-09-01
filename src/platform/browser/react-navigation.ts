import { useSyncExternalStore } from 'react';
import type { LightningHistory } from './navigation-history';

export function useNavigationSnapshot(navigation: LightningHistory): string {
  return useSyncExternalStore(navigation.subscribe, navigation.getSnapshot, navigation.getSnapshot);
}
