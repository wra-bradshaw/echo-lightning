import { useLayoutEffect, useRef } from 'react';

export type KeepPlayingOptions = {
  isPlaying: boolean;
  getVideoElements: () => readonly HTMLMediaElement[];
};

export function useKeepPlaying({ isPlaying, getVideoElements }: KeepPlayingOptions): void {
  const wasPlayingRef = useRef(isPlaying);

  useLayoutEffect(() => {
    wasPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useLayoutEffect(() => {
    const resumeIfNeeded = () => {
      if (!wasPlayingRef.current) return;
      for (const element of getVideoElements()) {
        if (element.paused && !element.ended) void element.play().catch(() => undefined);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') resumeIfNeeded();
      else wasPlayingRef.current = isPlaying;
    };

    const handleWindowFocus = () => resumeIfNeeded();
    const handleWindowBlur = () => {
      wasPlayingRef.current = isPlaying;
    };

    const handlePageShow = () => resumeIfNeeded();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [getVideoElements, isPlaying]);
}
