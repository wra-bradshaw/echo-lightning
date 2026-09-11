/* eslint-disable react-hooks/set-state-in-effect */
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
} from 'react';

export type ControlVisibilityOptions = {
  isPlaying: boolean;
  timeoutMs?: number;
  holdVisible?: boolean;
};

export type ControlVisibility = {
  visible: boolean;
  onMouseMove: MouseEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onFocusCapture: FocusEventHandler<HTMLElement>;
  onBlurCapture: FocusEventHandler<HTMLElement>;
};

export function useControlVisibility({
  isPlaying,
  timeoutMs = 2000,
  holdVisible = false,
}: ControlVisibilityOptions): ControlVisibility {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimer();
    if (!isPlaying || holdVisible) return;
    timerRef.current = window.setTimeout(() => setVisible(false), timeoutMs);
  }, [clearTimer, holdVisible, isPlaying, timeoutMs]);

  const showAndSchedule = useCallback(() => {
    setVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useLayoutEffect(() => {
    if (!isPlaying || holdVisible) {
      clearTimer();
      setVisible(true);
      return;
    }
    setVisible(true);
    scheduleHide();
    return clearTimer;
  }, [clearTimer, holdVisible, isPlaying, scheduleHide]);

  useLayoutEffect(() => clearTimer, [clearTimer]);

  return {
    visible,
    onMouseMove: showAndSchedule,
    onPointerMove: showAndSchedule,
    onPointerDown: showAndSchedule,
    onKeyDown: showAndSchedule,
    onFocusCapture: showAndSchedule,
    onBlurCapture: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) showAndSchedule();
    },
  };
}
