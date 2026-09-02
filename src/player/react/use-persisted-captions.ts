/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export function usePersistedCaptionsEnabled(
  savedEnabled: boolean | undefined,
  onChange?: (enabled: boolean) => void,
): readonly [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabledState] = useState(savedEnabled ?? true);
  const onChangeRef = useRef(onChange);
  const hasHydrated = useRef(false);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useLayoutEffect(() => {
    setEnabledState(savedEnabled ?? true);
    hasHydrated.current = false;
  }, [savedEnabled]);

  useLayoutEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    onChangeRef.current?.(enabled);
  }, [enabled]);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(Boolean(next));
  }, []);

  return [enabled, setEnabled] as const;
}
