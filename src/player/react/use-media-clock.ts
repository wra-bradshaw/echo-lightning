import { useEffect, useState } from 'react';

export function useMediaClock(media: HTMLMediaElement | null, frequencyHz = 4): number {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!media) return;
    const interval = window.setInterval(() => setTime(media.currentTime), 1000 / Math.max(1, frequencyHz));
    const reset = () => setTime(media.currentTime);
    media.addEventListener('seeking', reset);
    media.addEventListener('ended', reset);
    return () => {
      window.clearInterval(interval);
      media.removeEventListener('seeking', reset);
      media.removeEventListener('ended', reset);
    };
  }, [frequencyHz, media]);
  return time;
}
