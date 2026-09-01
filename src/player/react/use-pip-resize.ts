import { useCallback, useRef } from 'react';
import type { PipSize, ViewportSize } from '../core/pip-placement';

export function usePipResize(pipSize: PipSize, viewportSize: ViewportSize, onResize: (size: PipSize) => void) {
  const start = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      start.current = { x: event.clientX, y: event.clientY, width: pipSize.width, height: pipSize.height };
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [pipSize.height, pipSize.width],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!start.current) return;
      const deltaX = event.clientX - start.current.x;
      const deltaY = event.clientY - start.current.y;
      const delta = Math.max(deltaX, (deltaY * 16) / 9);
      let newWidth = start.current.width + delta;
      const maxWidthByViewport = Math.max(148, viewportSize.width - 32);
      const maxHeightByViewport = Math.max(83, viewportSize.height - 32);
      const maxWidthByHeight = (maxHeightByViewport * 16) / 9;
      const maxWidth = Math.min(480, maxWidthByViewport, maxWidthByHeight);
      newWidth = Math.max(148, Math.min(maxWidth, newWidth));
      const newHeight = (newWidth * 9) / 16;
      onResize({ width: newWidth, height: newHeight });
    },
    [onResize, viewportSize.height, viewportSize.width],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    start.current = null;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      return;
    }
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  };
}
