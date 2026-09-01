import { useHotkeys, type RegisterableHotkey } from '@tanstack/react-hotkeys';
import { useCallback, useMemo, type RefObject } from 'react';
import { getPlayerHotkeyAction, type PlayerHotkeyAction, type PlayerHotkeyState } from '../core/player-hotkeys';

const PLAYER_HOTKEYS = [
  'Space',
  'K',
  'M',
  'F',
  'C',
  'I',
  'ArrowLeft',
  'ArrowRight',
  'J',
  'L',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  ',',
  '.',
  { key: '.', shift: true },
  { key: ',', shift: true },
] as const satisfies readonly RegisterableHotkey[];

export type UsePlayerHotkeysOptions = PlayerHotkeyState & {
  onAction: (action: PlayerHotkeyAction) => void;
  target: RefObject<HTMLElement | null>;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, input, select, textarea, [role="slider"]'));
}

export function usePlayerHotkeys({ onAction, target, ...state }: UsePlayerHotkeysOptions): void {
  const handleHotkey = useCallback(
    (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target)) return;
      const action = getPlayerHotkeyAction(event.key, state);
      if (action) onAction(action);
    },
    [onAction, state],
  );
  const hotkeys = useMemo(() => PLAYER_HOTKEYS.map((hotkey) => ({ hotkey, callback: handleHotkey })), [handleHotkey]);

  useHotkeys(hotkeys, {
    ignoreInputs: true,
    preventDefault: true,
    requireReset: true,
    stopPropagation: true,
    target,
  });
}
