import { useCallback, useLayoutEffect, useState, type RefCallback } from 'react';

export type ElementSize = { width: number; height: number };

const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

export function useElementSize<T extends HTMLElement>(): { ref: RefCallback<T>; size: ElementSize; element: T | null } {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize>(EMPTY_SIZE);
  const ref = useCallback<RefCallback<T>>((next) => {
    setElement(next);
    if (!next) setSize(EMPTY_SIZE);
  }, []);

  useLayoutEffect(() => {
    if (!element) {
      return;
    }
    const update = (width: number, height: number) => {
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    };
    queueMicrotask(() => {
      if (element.isConnected) update(element.getBoundingClientRect().width, element.getBoundingClientRect().height);
    });
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      update(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref, size, element };
}
