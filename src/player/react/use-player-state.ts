/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPlayerState, reducePlayerState, type PlayerAction, type PlayerState } from '../core/player-state';
import { restoreSelectedStreamIds } from '../core/preferences';

function restorePlayerState(
  availableIds: readonly string[],
  savedState: PlayerState | undefined,
  savedIds: readonly string[] | undefined,
): PlayerState {
  if (savedState && savedState.selectedIds.length) {
    const available = new Set(availableIds);
    const filteredSelected = savedState.selectedIds.filter(
      (id, index) => available.has(id) && savedState.selectedIds.indexOf(id) === index,
    );
    const selectedIds = filteredSelected.length ? filteredSelected : restoreSelectedStreamIds(availableIds, savedIds);
    const mainId =
      available.has(savedState.mainId) && selectedIds.includes(savedState.mainId)
        ? savedState.mainId
        : (selectedIds[0] ?? '');
    const audioId =
      available.has(savedState.audioId) && selectedIds.includes(savedState.audioId) ? savedState.audioId : mainId;
    const pipPositions: PlayerState['pipPositions'] = {};
    for (const [id, pos] of Object.entries(savedState.pipPositions)) {
      if (available.has(id) && selectedIds.includes(id) && id !== mainId) pipPositions[id] = pos;
    }
    const mode: PlayerState['mode'] =
      savedState.mode === 'grid' || savedState.mode === 'focus' ? savedState.mode : 'grid';
    return { mode, selectedIds, mainId, audioId, pipPositions };
  }
  const initialIds = restoreSelectedStreamIds(availableIds, savedIds);
  return createPlayerState(initialIds);
}

export function usePlayerState(
  availableIds: readonly string[],
  savedIds: readonly string[] | undefined,
  onSelectionChange?: (ids: readonly string[]) => void,
  savedState?: PlayerState | undefined,
  onStateChange?: (state: PlayerState) => void,
) {
  const initialState = useMemo(
    () => restorePlayerState(availableIds, savedState, savedIds),
    [availableIds, savedIds, savedState],
  );
  const [state, setState] = useState<PlayerState>(() => initialState);
  const selectionChangeRef = useRef(onSelectionChange);
  const stateChangeRef = useRef(onStateChange);
  const hasHydrated = useRef(false);

  useLayoutEffect(() => {
    selectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useLayoutEffect(() => {
    stateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useLayoutEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
    selectionChangeRef.current?.(state.selectedIds);
    stateChangeRef.current?.(state);
  }, [state]);

  useLayoutEffect(() => {
    setState(restorePlayerState(availableIds, savedState, savedIds));
    hasHydrated.current = false;
  }, [availableIds, savedIds, savedState]);

  const dispatch = useCallback((action: PlayerAction) => {
    setState((current) => reducePlayerState(current, action));
  }, []);

  return { state, dispatch };
}
