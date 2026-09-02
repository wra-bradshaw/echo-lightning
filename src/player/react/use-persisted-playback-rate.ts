import { usePersistedState } from './use-persisted-state';

const clampPlaybackRate = (rate: number): number => (Number.isFinite(rate) ? Math.min(10, Math.max(0.25, rate)) : 1);

export function usePersistedPlaybackRate(
  savedPlaybackRate: number | undefined,
  onPlaybackRateChange?: (rate: number) => void,
): readonly [number, (rate: number) => void] {
  return usePersistedState(savedPlaybackRate, 1, clampPlaybackRate, onPlaybackRateChange);
}
