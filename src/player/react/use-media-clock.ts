import { useLayoutEffect, useRef, useState } from 'react';

export function useMediaClock(media: HTMLMediaElement | null, frequencyHz = 4): number {
  const [time, setTime] = useState(0);
  const previousMedia = useRef<HTMLMediaElement | null>(null);
  useLayoutEffect(() => {
    if (!media) return;
    const reset = () => setTime(media.currentTime);
    if (!previousMedia.current) reset();
    previousMedia.current = media;
    const interval = window.setInterval(reset, 1000 / Math.max(1, frequencyHz));
    media.addEventListener('timeupdate', reset);
    media.addEventListener('seeking', reset);
    media.addEventListener('ended', reset);
    return () => {
      window.clearInterval(interval);
      media.removeEventListener('timeupdate', reset);
      media.removeEventListener('seeking', reset);
      media.removeEventListener('ended', reset);
    };
  }, [frequencyHz, media]);
  return time;
}
