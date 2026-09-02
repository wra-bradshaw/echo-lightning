import { useLayoutEffect, useRef } from 'react';

export type DocumentVisibilityOptions = {
  onChange: (visibilityState: DocumentVisibilityState) => void;
  documentTarget?: Document;
};

export function useDocumentVisibility({ onChange, documentTarget }: DocumentVisibilityOptions): void {
  const callbackRef = useRef(onChange);
  useLayoutEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  useLayoutEffect(() => {
    const target = documentTarget ?? (typeof document === 'undefined' ? undefined : document);
    if (!target) return;
    const handleChange = () => callbackRef.current(target.visibilityState);
    target.addEventListener('visibilitychange', handleChange);
    return () => target.removeEventListener('visibilitychange', handleChange);
  }, [documentTarget]);
}
