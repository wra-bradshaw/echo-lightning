import { useCallback, useEffect, useRef, useState } from 'react';
import type { PipCorner, PipSize, ViewportSize } from '../core/pip-placement';

export function usePipResize(
  pipSize: PipSize,
  viewportSize: ViewportSize,
  corner: PipCorner,
  onResize: (size: PipSize) => void,
) {
  const start = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const handleWindowMove = (event: PointerEvent) => {
      if (!start.current) return;
      const isRightHandle = corner.endsWith('right') ? false : true;
      const isBottomHandle = corner.startsWith('bottom') ? false : true;
      const directionX = isRightHandle ? 1 : -1;
      const directionY = isBottomHandle ? 1 : -1;
      const deltaX = (event.clientX - start.current.x) * directionX;
      const deltaY = (event.clientY - start.current.y) * directionY;
      const delta = Math.max(deltaX, (deltaY * 16) / 9);
      let newWidth = start.current.width + delta;
      const maxWidthByViewport = Math.max(148, viewportSize.width - 32);
      const maxHeightByViewport = Math.max(83, viewportSize.height - 32);
      const maxWidthByHeight = (maxHeightByViewport * 16) / 9;
      const maxWidth = Math.min(480, maxWidthByViewport, maxWidthByHeight);
      newWidth = Math.max(148, Math.min(maxWidth, newWidth));
      const newHeight = (newWidth * 9) / 16;
      onResize({ width: newWidth, height: newHeight });
    };
    const handleWindowUp = () => {
      start.current = null;
      setIsResizing(false);
    };
    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
    window.addEventListener('blur', handleWindowUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
      window.removeEventListener('blur', handleWindowUp);
    };
  }, [corner, isResizing, onResize, viewportSize.height, viewportSize.width]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      start.current = { x: event.clientX, y: event.clientY, width: pipSize.width, height: pipSize.height };
      setIsResizing(true);
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [pipSize.height, pipSize.width],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!start.current) return;
      const isRightHandle = corner.endsWith('right') ? false : true;
      const isBottomHandle = corner.startsWith('bottom') ? false : true;
      const directionX = isRightHandle ? 1 : -1;
      const directionY = isBottomHandle ? 1 : -1;
      const deltaX = (event.clientX - start.current.x) * directionX;
      const deltaY = (event.clientY - start.current.y) * directionY;
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
    [corner, onResize, viewportSize.height, viewportSize.width],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    start.current = null;
    setIsResizing(false);
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
    onLostPointerCapture: handlePointerUp,
  };
}
