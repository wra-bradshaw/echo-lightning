import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPlayerState, reducePlayerState, type PlayerAction, type PlayerState } from '../core/player-state';
import { restoreSelectedStreamIds } from '../core/preferences';

export function usePlayerState(
  availableIds: readonly string[],
  savedIds: readonly string[] | undefined,
  onSelectionChange?: (ids: readonly string[]) => void,
) {
  const initialIds = useMemo(() => restoreSelectedStreamIds(availableIds, savedIds), [availableIds, savedIds]);
  const [state, setState] = useState<PlayerState>(() => createPlayerState(initialIds));
  const selectionChangeRef = useRef(onSelectionChange);

  useLayoutEffect(() => {
    selectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useLayoutEffect(() => {
    selectionChangeRef.current?.(state.selectedIds);
  }, [state.selectedIds]);

  const dispatch = useCallback((action: PlayerAction) => {
    setState((current) => reducePlayerState(current, action));
  }, []);

  return { state, dispatch };
}
