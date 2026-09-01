import {
  useCallback,
  useLayoutEffect,
  useState,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type PointerEventHandler,
} from 'react';

export type ControlVisibilityOptions = {
  isPlaying: boolean;
  timeoutMs?: number;
};

export type ControlVisibility = {
  visible: boolean;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onFocusCapture: FocusEventHandler<HTMLElement>;
  onBlurCapture: FocusEventHandler<HTMLElement>;
};

export function useControlVisibility({ isPlaying, timeoutMs = 2400 }: ControlVisibilityOptions): ControlVisibility {
  const [active, setActive] = useState(true);
  const [focused, setFocused] = useState(false);
  const [activityTick, setActivityTick] = useState(0);
  const activate = useCallback(() => {
    setActive(true);
    setActivityTick((tick) => tick + 1);
  }, []);

  useLayoutEffect(() => {
    if (!isPlaying || focused || !active) return;
    const timer = window.setTimeout(() => setActive(false), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [activityTick, active, focused, isPlaying, timeoutMs]);

  return {
    visible: !isPlaying || focused || active,
    onPointerMove: activate,
    onPointerDown: activate,
    onKeyDown: activate,
    onFocusCapture: () => {
      setFocused(true);
      activate();
    },
    onBlurCapture: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
    },
  };
}
