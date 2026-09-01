import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePlayerHotkeys } from './use-player-hotkeys';

describe('usePlayerHotkeys', () => {
  it('dispatches a YouTube shortcut from the scoped player target', () => {
    const target = document.createElement('div');
    document.body.append(target);
    const onAction = vi.fn();
    const { unmount } = renderHook(() =>
      usePlayerHotkeys({
        duration: 600,
        isPlaying: true,
        onAction,
        playbackRate: 1,
        target: { current: target },
        volume: 1,
      }),
    );

    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'KeyJ', key: 'j' }));

    expect(onAction).toHaveBeenCalledWith({ type: 'seek', seconds: -10 });
    unmount();
  });

  it('leaves focused player controls to their native keyboard behavior', () => {
    const target = document.createElement('div');
    const button = document.createElement('button');
    target.append(button);
    document.body.append(target);
    const onAction = vi.fn();
    const { unmount } = renderHook(() =>
      usePlayerHotkeys({
        duration: 600,
        isPlaying: true,
        onAction,
        playbackRate: 1,
        target: { current: target },
        volume: 1,
      }),
    );

    button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'KeyK', key: 'k' }));

    expect(onAction).not.toHaveBeenCalled();
    unmount();
  });
});
