import { useLayoutEffect, useRef } from 'react';

export function useDocumentEvent<K extends keyof DocumentEventMap>(
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: { enabled?: boolean; documentTarget?: Document },
): void {
  const enabled = options?.enabled ?? true;
  const documentTarget = options?.documentTarget;
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const target = documentTarget ?? (typeof document === 'undefined' ? undefined : document);
    if (!target) return;
    const listener = (event: DocumentEventMap[K]) => handlerRef.current(event);
    target.addEventListener(type, listener as EventListener);
    return () => target.removeEventListener(type, listener as EventListener);
  }, [documentTarget, enabled, type]);
}
