import { useLayoutEffect, useRef } from 'react';

export function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: { enabled?: boolean; windowTarget?: Window; capture?: boolean },
): void {
  const enabled = options?.enabled ?? true;
  const capture = options?.capture;
  const windowTarget = options?.windowTarget;
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const target = windowTarget ?? (typeof window === 'undefined' ? undefined : window);
    if (!target) return;
    const listener = (event: WindowEventMap[K]) => handlerRef.current(event);
    target.addEventListener(type, listener as EventListener, capture);
    return () => target.removeEventListener(type, listener as EventListener, capture);
  }, [capture, enabled, type, windowTarget]);
}
