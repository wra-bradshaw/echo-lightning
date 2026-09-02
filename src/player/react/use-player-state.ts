import { useCallback, useMemo } from 'react';
import { createPlayerState, reducePlayerState, type PlayerAction, type PlayerState } from '../core/player-state';
import { restoreSelectedStreamIds } from '../core/preferences';
import { usePersistedState } from './use-persisted-state';

function restorePlayerState(
  availableIds: readonly string[],
  savedState: PlayerState | undefined,
  savedIds: readonly string[] | undefined,
): PlayerState {
  if (savedState && savedState.selectedIds.length) {
    const available = new Set(availableIds);
    const seen = new Set<string>();
    const filteredSelected = savedState.selectedIds.filter((id) => {
      if (!available.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const selectedIds = filteredSelected.length ? filteredSelected : restoreSelectedStreamIds(availableIds, savedIds);
    const mainId =
      available.has(savedState.mainId) && selectedIds.includes(savedState.mainId)
        ? savedState.mainId
        : (selectedIds[0] ?? '');
    const audioId =
      available.has(savedState.audioId) && selectedIds.includes(savedState.audioId) ? savedState.audioId : mainId;
    const selectedSet = new Set(selectedIds);
    const pipPositions: PlayerState['pipPositions'] = {};
    for (const [id, pos] of Object.entries(savedState.pipPositions)) {
      if (available.has(id) && selectedSet.has(id) && id !== mainId) pipPositions[id] = pos;
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
  const savedPlayerState = useMemo(
    () => restorePlayerState(availableIds, savedState, savedIds),
    [availableIds, savedIds, savedState],
  );
  const persistStateChange = useCallback(
    (state: PlayerState) => {
      onSelectionChange?.(state.selectedIds);
      onStateChange?.(state);
    },
    [onSelectionChange, onStateChange],
  );
  const [state, setState] = usePersistedState(savedPlayerState, initialState, (value) => value, persistStateChange);

  const dispatch = useCallback(
    (action: PlayerAction) => {
      setState((current) => reducePlayerState(current, action));
    },
    [setState],
  );

  return { state, dispatch };
}
