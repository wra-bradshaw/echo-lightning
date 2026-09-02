import { usePersistedState } from './use-persisted-state';

const clampMuted = (muted: boolean): boolean => Boolean(muted);

export function usePersistedMuted(
  savedMuted: boolean | undefined,
  onChange?: (muted: boolean) => void,
): readonly [boolean, (muted: boolean) => void] {
  return usePersistedState(savedMuted, false, clampMuted, onChange);
}
