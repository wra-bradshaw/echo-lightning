import { useLayoutEffect } from 'react';

export function useCaptionTracks(media: HTMLMediaElement | null, _enabled: boolean): void {
  void _enabled;
  useLayoutEffect(() => {
    if (!media) return;
    for (const track of Array.from(media.textTracks)) track.mode = 'hidden';
  }, [_enabled, media]);
}
