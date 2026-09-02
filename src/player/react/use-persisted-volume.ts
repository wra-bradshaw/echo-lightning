import { usePersistedState } from './use-persisted-state';

const clampVolume = (volume: number): number => (Number.isFinite(volume) ? Math.min(5, Math.max(0, volume)) : 0);

export function usePersistedVolume(
  savedVolume: number | undefined,
  onVolumeChange?: (volume: number) => void,
): readonly [number, (volume: number) => void] {
  return usePersistedState(savedVolume, 1, clampVolume, onVolumeChange);
}
