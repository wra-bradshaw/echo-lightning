import { useLayoutEffect } from 'react';

export function useCaptionTracks(media: HTMLMediaElement | null, enabled: boolean): void {
  useLayoutEffect(() => {
    if (!media) return;
    for (const track of Array.from(media.textTracks)) track.mode = enabled ? 'hidden' : 'disabled';
  }, [enabled, media]);
}
