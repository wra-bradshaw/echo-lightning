import { useEffect } from 'react';

export function useCaptionTracks(media: HTMLMediaElement | null, enabled: boolean): void {
  useEffect(() => {
    if (!media) return;
    for (const track of Array.from(media.textTracks)) track.mode = enabled ? 'showing' : 'hidden';
  }, [enabled, media]);
}
