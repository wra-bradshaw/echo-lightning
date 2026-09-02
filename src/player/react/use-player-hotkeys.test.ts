import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePlayerHotkeys } from './use-player-hotkeys';

describe('usePlayerHotkeys', () => {
  it('dispatches a YouTube shortcut globally without requiring player focus', () => {
    const onAction = vi.fn();
    const { unmount } = renderHook(() =>
      usePlayerHotkeys({
        duration: 600,
        isPlaying: true,
        onAction,
        playbackRate: 1,
        volume: 1,
      }),
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'KeyJ', key: 'j' }));

    expect(onAction).toHaveBeenCalledWith({ type: 'seek', seconds: -10 });
    unmount();
  });

  it('dispatches even when the event originates from an element outside the player', () => {
    const onAction = vi.fn();
    const { unmount } = renderHook(() =>
      usePlayerHotkeys({
        duration: 600,
        isPlaying: true,
        onAction,
        playbackRate: 1,
        volume: 1,
      }),
    );

    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'Space', key: ' ' }));

    expect(onAction).toHaveBeenCalledWith({ type: 'toggle-playback' });
    unmount();
  });

  it('leaves focused player controls to their native keyboard behavior', () => {
    const button = document.createElement('button');
    document.body.append(button);
    const onAction = vi.fn();
    const { unmount } = renderHook(() =>
      usePlayerHotkeys({
        duration: 600,
        isPlaying: true,
        onAction,
        playbackRate: 1,
        volume: 1,
      }),
    );

    button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'KeyK', key: 'k' }));

    expect(onAction).not.toHaveBeenCalled();
    unmount();
    button.remove();
  });
});
