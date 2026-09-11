import { useLayoutEffect, useState, type RefObject } from 'react';

export function usePointerHeld<T extends HTMLElement>(targetRef: RefObject<T | null>): boolean {
  const [held, setHeld] = useState(false);

  useLayoutEffect(() => {
    const active = new Set<number>();
    const sync = () => setHeld(active.size > 0);

    const onDown = (event: PointerEvent) => {
      const target = targetRef.current;
      if (!target) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const inside = path.length > 0 ? path.includes(target) : target.contains(event.target as Node);
      if (!inside) return;
      active.add(event.pointerId);
      sync();
    };

    const release = (event: PointerEvent) => {
      if (active.delete(event.pointerId)) sync();
    };

    const releaseAll = () => {
      if (active.size === 0) return;
      active.clear();
      sync();
    };

    window.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointerup', release, { capture: true });
    window.addEventListener('pointercancel', release, { capture: true });
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointerup', release, { capture: true });
      window.removeEventListener('pointercancel', release, { capture: true });
      window.removeEventListener('blur', releaseAll);
    };
  }, [targetRef]);

  return held;
}
