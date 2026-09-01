import { useLayoutEffect } from 'react';

export function useMediaVolume(media: HTMLMediaElement | null, volume: number): void {
  useLayoutEffect(() => {
    if (media) media.volume = volume;
  }, [media, volume]);
}
