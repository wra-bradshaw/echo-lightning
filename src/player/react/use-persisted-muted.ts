/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export function usePersistedMuted(
  savedMuted: boolean | undefined,
  onChange?: (muted: boolean) => void,
): readonly [boolean, (muted: boolean) => void] {
  const [muted, setMutedState] = useState(savedMuted ?? false);
  const onChangeRef = useRef(onChange);
  const hasHydrated = useRef(false);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useLayoutEffect(() => {
    setMutedState(savedMuted ?? false);
    hasHydrated.current = false;
  }, [savedMuted]);

  useLayoutEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    onChangeRef.current?.(muted);
  }, [muted]);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(Boolean(next));
  }, []);

  return [muted, setMuted] as const;
}
