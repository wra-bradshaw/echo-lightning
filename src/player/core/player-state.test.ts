import { describe, expect, it } from 'vitest';
import { createPlayerState, reducePlayerState } from './player-state';

describe('player state', () => {
  it('switches from grid to focus and makes the focused stream audible', () => {
    const state = createPlayerState(['camera-1', 'camera-2', 'camera-3']);
    const focused = reducePlayerState(state, { type: 'focus', id: 'camera-2' });

    expect(focused.mode).toBe('focus');
    expect(focused.mainId).toBe('camera-2');
    expect(focused.audioId).toBe('camera-2');
    expect(focused.selectedIds).toEqual(['camera-1', 'camera-2', 'camera-3']);
    expect(Object.keys(focused.pipPositions)).toEqual(['camera-1', 'camera-3']);
  });

  it('promotes a PiP and gives the outgoing main its stack position', () => {
    const state = reducePlayerState(createPlayerState(['camera-1', 'camera-2', 'camera-3']), {
      type: 'focus',
      id: 'camera-1',
    });
    const promoted = reducePlayerState(state, { type: 'promote', id: 'camera-3' });

    expect(promoted.mainId).toBe('camera-3');
    expect(promoted.audioId).toBe('camera-3');
    expect(promoted.pipPositions['camera-1']).toEqual(state.pipPositions['camera-3']);
    expect(promoted.pipPositions['camera-3']).toBeUndefined();
  });

  it('selects a replacement when the current audio or main stream is removed', () => {
    const state = reducePlayerState(createPlayerState(['camera-1', 'camera-2']), {
      type: 'focus',
      id: 'camera-2',
    });
    const removed = reducePlayerState(state, { type: 'remove', id: 'camera-2' });

    expect(removed.selectedIds).toEqual(['camera-1']);
    expect(removed.mainId).toBe('camera-1');
    expect(removed.audioId).toBe('camera-1');
    expect(reducePlayerState(removed, { type: 'remove', id: 'camera-1' })).toEqual(removed);
  });

  it('changes the grid audio source without allowing an unselected source', () => {
    const state = createPlayerState(['camera-1', 'camera-2']);
    expect(reducePlayerState(state, { type: 'set-audio', id: 'camera-2' }).audioId).toBe('camera-2');
    expect(reducePlayerState(state, { type: 'set-audio', id: 'missing' })).toEqual(state);
  });
});
