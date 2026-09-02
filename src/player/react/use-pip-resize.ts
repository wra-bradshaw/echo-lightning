import { useCallback, useRef } from 'react';
import type { PipCorner, PipSize, ViewportSize } from '../core/pip-placement';
import { getPipHeight, getPipMaxWidth, PIP_MIN_WIDTH } from '../core/pip-constants';
import { usePointerDrag } from './use-pointer-drag';

type ResizeStart = { width: number };

export function usePipResize(
  pipSize: PipSize,
  viewportSize: ViewportSize,
  corner: PipCorner,
  onResize: (size: PipSize) => void,
) {
  const startRef = useRef<ResizeStart | null>(null);

  const handleMove = useCallback(
    (_event: PointerEvent, { delta }: { delta: { x: number; y: number } }) => {
      const start = startRef.current;
      if (!start) return;
      const directionX = corner.endsWith('right') ? -1 : 1;
      const directionY = corner.startsWith('bottom') ? -1 : 1;
      const deltaX = delta.x * directionX;
      const deltaY = delta.y * directionY;
      const widthDelta = Math.max(deltaX, (deltaY * 16) / 9);
      const maxWidth = getPipMaxWidth(viewportSize);
      const width = Math.max(PIP_MIN_WIDTH, Math.min(maxWidth, start.width + widthDelta));
      onResize({ width, height: getPipHeight(width) });
    },
    [corner, onResize, viewportSize],
  );

  const clearStart = useCallback(() => {
    startRef.current = null;
  }, []);

  const drag = usePointerDrag({
    onStart: () => {
      startRef.current = { width: pipSize.width };
    },
    onMove: handleMove,
    onEnd: clearStart,
    onCancel: clearStart,
  });

  const { onPointerDown } = drag;
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onPointerDown(event);
    },
    [onPointerDown],
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: drag.onPointerMove,
    onPointerUp: drag.onPointerUp,
    onLostPointerCapture: drag.onLostPointerCapture,
  };
}
