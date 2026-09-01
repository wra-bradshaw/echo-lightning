/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PanInfo } from 'motion/react';
import type { PipSize, ViewportSize } from '../core/pip-placement';

type DragState = { x: number; y: number };

export function usePipDrag(
  coordinates: { x: number; y: number },
  _pipSize: PipSize,
  _viewportSize: ViewportSize,
  onPipDrop: (id: string, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void,
  sourceId: string,
  onVideoClick: () => void,
) {
  void _pipSize;
  void _viewportSize;
  const dragged = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ pointerX: number; pointerY: number; origX: number; origY: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<DragState>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isDragging && pendingPreview) {
      const current = { x: coordinates.x, y: coordinates.y };
      const dist = Math.hypot(pendingPreview.x - current.x, pendingPreview.y - current.y);
      if (dist > 2) {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setPendingPreview(null);
      } else {
        setPendingPreview(null);
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
      }
    }
  }, [coordinates.x, coordinates.y, isDragging, pendingPreview]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-testid="pip-resize-handle"]')) return;
      dragged.current = false;
      pointerStart.current = { x: event.clientX, y: event.clientY };
      dragStart.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        origX: coordinates.x,
        origY: coordinates.y,
      };
      setIsDragging(true);
    },
    [coordinates.x, coordinates.y],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = event.clientX - dragStart.current.pointerX;
    const dy = event.clientY - dragStart.current.pointerY;
    if (Math.hypot(dx, dy) > 4) dragged.current = true;
    setDragOffset({ x: dx, y: dy });
    const start = pointerStart.current;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) dragged.current = true;
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      const start = dragStart.current;
      const pointer = pointerStart.current;
      dragStart.current = null;
      pointerStart.current = null;
      try {
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      if (!start) {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        return;
      }
      const dx = event.clientX - start.pointerX;
      const dy = event.clientY - start.pointerY;
      const moved = Math.hypot(dx, dy) > 4;
      if (moved) dragged.current = true;
      if (dragged.current) {
        dragged.current = false;
        if (moved) {
          const preview = { x: start.origX + dx, y: start.origY + dy };
          setPendingPreview(preview);
          const info = {
            point: { x: event.clientX, y: event.clientY },
            offset: { x: dx, y: dy },
            delta: { x: dx, y: dy },
            velocity: { x: 0, y: 0 },
          } as unknown as PanInfo;
          onPipDrop(sourceId, event as unknown as MouseEvent, info);
          return;
        }
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        onVideoClick();
        return;
      }
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4) return;
      onVideoClick();
    },
    [onPipDrop, onVideoClick, sourceId],
  );

  const handlePointerCancel = useCallback(() => {
    dragStart.current = null;
    pointerStart.current = null;
    dragged.current = false;
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    setPendingPreview(null);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleWindowMove = (event: PointerEvent) => {
      if (!dragStart.current) return;
      const dx = event.clientX - dragStart.current.pointerX;
      const dy = event.clientY - dragStart.current.pointerY;
      if (Math.hypot(dx, dy) > 4) dragged.current = true;
      setDragOffset({ x: dx, y: dy });
    };
    const handleWindowUp = (event: PointerEvent) => {
      const start = dragStart.current;
      const pointer = pointerStart.current;
      dragStart.current = null;
      pointerStart.current = null;
      if (!start) {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        return;
      }
      const dx = event.clientX - start.pointerX;
      const dy = event.clientY - start.pointerY;
      const moved = Math.hypot(dx, dy) > 4;
      if (moved) dragged.current = true;
      if (dragged.current) {
        dragged.current = false;
        if (moved) {
          const preview = { x: start.origX + dx, y: start.origY + dy };
          setPendingPreview(preview);
          const info = {
            point: { x: event.clientX, y: event.clientY },
            offset: { x: dx, y: dy },
            delta: { x: dx, y: dy },
            velocity: { x: 0, y: 0 },
          } as unknown as PanInfo;
          onPipDrop(sourceId, event as unknown as MouseEvent, info);
          return;
        }
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        onVideoClick();
        return;
      }
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4) return;
      onVideoClick();
    };
    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
    const handleBlur = () => {
      dragStart.current = null;
      pointerStart.current = null;
      dragged.current = false;
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      setPendingPreview(null);
    };
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isDragging, onPipDrop, onVideoClick, sourceId]);

  const displayCoordinates = pendingPreview
    ? pendingPreview
    : isDragging
      ? { x: coordinates.x + dragOffset.x, y: coordinates.y + dragOffset.y }
      : coordinates;

  return {
    isDragging,
    displayCoordinates,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
