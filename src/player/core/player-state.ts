import { placePipStacks } from './pip-placement';
import type { PipPosition, PlayerMode, PlayerState } from '../../domain/player-types';

export type { PlayerState } from '../../domain/player-types';

export type PlayerAction =
  | { type: 'focus'; id: string }
  | { type: 'set-mode'; mode: PlayerMode }
  | { type: 'set-audio'; id: string }
  | { type: 'toggle'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'set-pip-position'; id: string; position: PipPosition }
  | { type: 'promote'; id: string };

const LAYOUT_VIEWPORT = { width: 1000, height: 700 };
const LAYOUT_PIP = { width: 240, height: 135 };

function withPips(state: PlayerState, selectedIds: readonly string[], mainId: string): PlayerState {
  const pipIds = selectedIds.filter((id) => id !== mainId);
  return {
    ...state,
    selectedIds: [...selectedIds],
    mainId,
    pipPositions: placePipStacks(pipIds, state.pipPositions, LAYOUT_VIEWPORT, LAYOUT_PIP, 16, 12),
  };
}

export function createPlayerState(ids: readonly string[]): PlayerState {
  const first = ids[0] ?? '';
  return {
    mode: 'grid',
    selectedIds: [...ids],
    mainId: first,
    audioId: first,
    pipPositions: {},
  };
}

export function reducePlayerState(state: PlayerState, action: PlayerAction): PlayerState {
  if (!state.selectedIds.length) return state;

  if (action.type === 'set-audio') {
    return state.selectedIds.includes(action.id) ? { ...state, audioId: action.id } : state;
  }

  if (action.type === 'set-pip-position') {
    if (state.mode !== 'focus' || !state.selectedIds.includes(action.id) || action.id === state.mainId) return state;
    return { ...state, pipPositions: { ...state.pipPositions, [action.id]: action.position } };
  }

  if (action.type === 'set-mode') {
    if (action.mode === state.mode) return state;
    if (action.mode === 'focus') {
      return { ...withPips(state, state.selectedIds, state.mainId), mode: 'focus', audioId: state.mainId };
    }
    return { ...state, mode: 'grid' };
  }

  if (action.type === 'focus') {
    if (!state.selectedIds.includes(action.id)) return state;
    return { ...withPips(state, state.selectedIds, action.id), mode: 'focus', audioId: action.id };
  }

  if (action.type === 'promote') {
    if (state.mode !== 'focus' || !state.selectedIds.includes(action.id) || action.id === state.mainId) return state;
    const outgoingPosition = state.pipPositions[action.id] ?? { corner: 'bottom-right', index: 0 };
    const nextPips = { ...state.pipPositions };
    delete nextPips[action.id];
    nextPips[state.mainId] = outgoingPosition;
    return {
      ...state,
      mainId: action.id,
      audioId: action.id,
      pipPositions: nextPips,
    };
  }

  if (action.type === 'toggle') {
    if (state.selectedIds.includes(action.id)) {
      if (state.selectedIds.length === 1) return state;
      return reducePlayerState(state, { type: 'remove', id: action.id });
    }
    const selectedIds = [...state.selectedIds, action.id];
    return state.mode === 'focus' ? withPips(state, selectedIds, state.mainId) : { ...state, selectedIds };
  }

  if (!state.selectedIds.includes(action.id) || state.selectedIds.length === 1) return state;
  const selectedIds = state.selectedIds.filter((id) => id !== action.id);
  const replacement = selectedIds[0]!;
  const mainId = state.mainId === action.id ? replacement : state.mainId;
  const audioId = state.audioId === action.id ? replacement : state.audioId;
  const pipPositions = { ...state.pipPositions };
  delete pipPositions[action.id];
  return {
    ...state,
    selectedIds,
    mainId,
    audioId,
    pipPositions:
      state.mode === 'focus'
        ? placePipStacks(
            selectedIds.filter((id) => id !== mainId),
            pipPositions,
            LAYOUT_VIEWPORT,
            LAYOUT_PIP,
            16,
            12,
          )
        : pipPositions,
  };
}
