import { describe, expect, it } from 'vitest';
import { getPlayerHotkeyAction, type PlayerHotkeyState } from './player-hotkeys';

const playingState: PlayerHotkeyState = {
  duration: 600,
  isPlaying: true,
  playbackRate: 1,
  volume: 0.5,
};

describe('player hotkeys', () => {
  it.each([
    [' ', { type: 'toggle-playback' }],
    ['Space', { type: 'toggle-playback' }],
    ['k', { type: 'toggle-playback' }],
    ['K', { type: 'toggle-playback' }],
    ['m', { type: 'toggle-mute' }],
    ['f', { type: 'toggle-fullscreen' }],
    ['c', { type: 'toggle-captions' }],
    ['i', { type: 'toggle-picture-in-picture' }],
  ])('maps %s to its YouTube player action', (key, action) => {
    expect(getPlayerHotkeyAction(key, playingState)).toEqual(action);
  });

  it.each([
    ['ArrowLeft', { type: 'seek', seconds: -5 }],
    ['ArrowRight', { type: 'seek', seconds: 5 }],
    ['j', { type: 'seek', seconds: -10 }],
    ['l', { type: 'seek', seconds: 10 }],
    ['ArrowUp', { type: 'set-volume', volume: 0.55 }],
    ['ArrowDown', { type: 'set-volume', volume: 0.45 }],
    ['Home', { type: 'seek-to', seconds: 0 }],
    ['End', { type: 'seek-to', seconds: 600 }],
    ['0', { type: 'seek-to', seconds: 0 }],
    ['5', { type: 'seek-to', seconds: 300 }],
    ['9', { type: 'seek-to', seconds: 540 }],
    ['>', { type: 'set-playback-rate', rate: 1.25 }],
    ['<', { type: 'set-playback-rate', rate: 0.75 }],
  ])('maps %s to its YouTube player action', (key, action) => {
    expect(getPlayerHotkeyAction(key, playingState)).toEqual(action);
  });

  it('only steps frames while paused', () => {
    expect(getPlayerHotkeyAction(',', { ...playingState, isPlaying: false })).toEqual({
      type: 'step-frame',
      seconds: -1 / 30,
    });
    expect(getPlayerHotkeyAction('.', { ...playingState, isPlaying: false })).toEqual({
      type: 'step-frame',
      seconds: 1 / 30,
    });
    expect(getPlayerHotkeyAction('.', playingState)).toBeNull();
  });

  it('clamps volume and playback speed at their player limits', () => {
    expect(getPlayerHotkeyAction('ArrowUp', { ...playingState, volume: 1 })).toBeNull();
    expect(getPlayerHotkeyAction('ArrowDown', { ...playingState, volume: 0 })).toBeNull();
    expect(getPlayerHotkeyAction('>', { ...playingState, playbackRate: 2 })).toBeNull();
    expect(getPlayerHotkeyAction('<', { ...playingState, playbackRate: 0.25 })).toBeNull();
  });

  it('ignores unsupported keys', () => {
    expect(getPlayerHotkeyAction('q', playingState)).toBeNull();
  });
});
