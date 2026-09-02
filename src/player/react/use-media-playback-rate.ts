import { useLayoutEffect } from 'react';

export function useMediaPlaybackRate(media: HTMLMediaElement | null, playbackRate: number): void {
  useLayoutEffect(() => {
    if (media) media.playbackRate = playbackRate;
  }, [media, playbackRate]);
}
