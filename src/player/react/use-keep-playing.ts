import { useCallback, useLayoutEffect, useRef } from 'react';
import { useDocumentVisibility } from './use-document-visibility';

export type KeepPlayingOptions = {
  isPlaying: boolean;
  getVideoElements: () => readonly HTMLMediaElement[];
};

export function useKeepPlaying({ isPlaying, getVideoElements }: KeepPlayingOptions): void {
  const wasPlayingRef = useRef(isPlaying);

  useLayoutEffect(() => {
    wasPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const resumeIfNeeded = useCallback(() => {
    if (!wasPlayingRef.current) return;
    for (const element of getVideoElements()) {
      if (element.paused && !element.ended) void element.play().catch(() => undefined);
    }
  }, [getVideoElements]);

  const handleVisibilityChange = useCallback(
    (visibilityState: DocumentVisibilityState) => {
      if (visibilityState === 'visible') resumeIfNeeded();
      else wasPlayingRef.current = isPlaying;
    },
    [isPlaying, resumeIfNeeded],
  );

  useDocumentVisibility({ onChange: handleVisibilityChange });

  useLayoutEffect(() => {
    const handleWindowFocus = () => resumeIfNeeded();
    const handleWindowBlur = () => {
      wasPlayingRef.current = isPlaying;
    };
    const handlePageShow = () => resumeIfNeeded();
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isPlaying, resumeIfNeeded]);
}
