import { usePersistedState } from './use-persisted-state';

const clampCaptions = (enabled: boolean): boolean => Boolean(enabled);

export function usePersistedCaptionsEnabled(
  savedEnabled: boolean | undefined,
  onChange?: (enabled: boolean) => void,
): readonly [boolean, (enabled: boolean) => void] {
  return usePersistedState(savedEnabled, true, clampCaptions, onChange);
}
