import { useCallback, useRef, useState } from 'react';
import type { PanInfo } from 'motion/react';
import { usePointerDrag } from './use-pointer-drag';

type DragState = { x: number; y: number };

export function usePipDrag(
  coordinates: { x: number; y: number },
  onPipDrop: (id: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void,
  sourceId: string,
  onVideoClick: () => void,
) {
  const dragStarted = useRef(false);
  const [dragOffset, setDragOffset] = useState<DragState>({ x: 0, y: 0 });

  const handleMove = useCallback((_event: PointerEvent, { delta }: { delta: DragState }) => {
    setDragOffset(delta);
  }, []);

  const handleEnd = useCallback(
    (event: PointerEvent, { delta, moved }: { delta: DragState; moved: boolean }) => {
      const started = dragStarted.current;
      dragStarted.current = false;
      setDragOffset({ x: 0, y: 0 });
      if (!started || !moved) {
        onVideoClick();
        return;
      }
      const info = {
        point: { x: event.clientX, y: event.clientY },
        offset: delta,
        delta,
        velocity: { x: 0, y: 0 },
      } as unknown as PanInfo;
      onPipDrop(sourceId, event as unknown as MouseEvent, info);
    },
    [onPipDrop, onVideoClick, sourceId],
  );

  const handleCancel = useCallback(() => {
    dragStarted.current = false;
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const drag = usePointerDrag({
    onStart: (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-testid="pip-resize-handle"]')) return false;
      dragStarted.current = true;
    },
    onMove: handleMove,
    onEnd: handleEnd,
    onCancel: handleCancel,
    threshold: 4,
  });

  const displayCoordinates = drag.isDragging
    ? { x: coordinates.x + dragOffset.x, y: coordinates.y + dragOffset.y }
    : coordinates;

  return {
    isDragging: drag.isDragging,
    displayCoordinates,
    handlePointerDown: drag.onPointerDown,
    handlePointerMove: drag.onPointerMove,
    handlePointerUp: drag.onPointerUp,
    handlePointerCancel: drag.onPointerCancel,
  };
}
