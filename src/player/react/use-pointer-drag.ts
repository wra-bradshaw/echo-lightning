import { useCallback, useLayoutEffect, useRef, useState, type PointerEventHandler } from 'react';

type PointerPosition = { x: number; y: number };

export type PointerDragUpdate = {
  delta: PointerPosition;
  moved: boolean;
};

export type PointerDragOptions = {
  onStart?: (event: PointerEvent) => boolean | void;
  onMove?: (event: PointerEvent, update: PointerDragUpdate) => void;
  onEnd?: (event: PointerEvent, update: PointerDragUpdate) => void;
  onCancel?: () => void;
  threshold?: number;
};

export type PointerDragHandlers = {
  isDragging: boolean;
  onPointerDown: PointerEventHandler;
  onPointerMove: PointerEventHandler;
  onPointerUp: PointerEventHandler;
  onPointerCancel: PointerEventHandler;
  onLostPointerCapture: PointerEventHandler;
};

export function usePointerDrag({
  onStart,
  onMove,
  onEnd,
  onCancel,
  threshold = 0,
}: PointerDragOptions): PointerDragHandlers {
  const startRef = useRef<PointerPosition | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const callbacksRef = useRef({ onStart, onMove, onEnd, onCancel });
  const [isDragging, setIsDragging] = useState(false);

  useLayoutEffect(() => {
    callbacksRef.current = { onStart, onMove, onEnd, onCancel };
  }, [onCancel, onEnd, onMove, onStart]);

  const finish = useCallback(
    (event: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const delta = { x: event.clientX - start.x, y: event.clientY - start.y };
      const update = { delta, moved: Math.hypot(delta.x, delta.y) > threshold };
      startRef.current = null;
      setIsDragging(false);
      try {
        targetRef.current?.releasePointerCapture(event.pointerId);
      } catch {
        targetRef.current = null;
      } finally {
        targetRef.current = null;
      }
      callbacksRef.current.onEnd?.(event, update);
    },
    [threshold],
  );

  const cancel = useCallback(() => {
    if (!startRef.current) return;
    startRef.current = null;
    targetRef.current = null;
    setIsDragging(false);
    callbacksRef.current.onCancel?.();
  }, []);

  useLayoutEffect(() => {
    if (!isDragging) return;
    const handleMove = (event: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const delta = { x: event.clientX - start.x, y: event.clientY - start.y };
      callbacksRef.current.onMove?.(event, { delta, moved: Math.hypot(delta.x, delta.y) > threshold });
    };
    const handleUp = (event: PointerEvent) => finish(event);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      window.removeEventListener('blur', cancel);
    };
  }, [cancel, finish, isDragging, threshold]);

  const onPointerDown = useCallback<PointerEventHandler>((event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    targetRef.current = event.currentTarget as HTMLElement;
    startRef.current = { x: event.clientX, y: event.clientY };
    if (callbacksRef.current.onStart?.(event.nativeEvent) === false) {
      startRef.current = null;
      targetRef.current = null;
      return;
    }
    setIsDragging(true);
  }, []);

  const onPointerUp = useCallback<PointerEventHandler>((event) => finish(event.nativeEvent), [finish]);
  const onPointerCancel = useCallback<PointerEventHandler>(() => cancel(), [cancel]);

  return {
    isDragging,
    onPointerDown,
    onPointerMove: () => undefined,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture: onPointerCancel,
  };
}
