import { useLayoutEffect, useMemo, useState } from 'react';
import { stripVttTags } from '../../shared/lib/strip-vtt-tags';

export function useCaptionCue(media: HTMLMediaElement | null, enabled: boolean, currentTime: number): string | null {
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    if (!media) return;
    for (const track of Array.from(media.textTracks)) track.mode = 'hidden';
  }, [enabled, media]);

  useLayoutEffect(() => {
    if (!media || !enabled) return;
    const tracks = Array.from(media.textTracks);
    for (const track of tracks) track.mode = 'hidden';
    const bump = () => setTick((value) => value + 1);
    for (const track of tracks) track.addEventListener('cuechange', bump);
    const onAddTrack = () => {
      for (const track of Array.from(media.textTracks)) {
        track.mode = 'hidden';
        track.addEventListener('cuechange', bump);
      }
      bump();
    };
    media.textTracks.addEventListener('addtrack' as never, onAddTrack as never);
    const interval = window.setInterval(bump, 300);
    bump();
    return () => {
      window.clearInterval(interval);
      for (const track of Array.from(media.textTracks)) track.removeEventListener('cuechange', bump);
      media.textTracks.removeEventListener('addtrack' as never, onAddTrack as never);
    };
  }, [enabled, media]);

  return useMemo(() => {
    void tick;
    if (!enabled || !media) return null;
    for (const track of Array.from(media.textTracks)) {
      const active = track.activeCues;
      if (active && active.length) {
        const texts: string[] = [];
        for (let index = 0; index < active.length; index += 1) {
          const cue = active[index] as unknown as VTTCue;
          if (cue && typeof cue.text === 'string' && cue.text.trim()) texts.push(stripVttTags(cue.text));
        }
        const joined = texts.join('\n').trim();
        if (joined) return joined;
      }
      const cues = track.cues;
      if (!cues) continue;
      for (let index = 0; index < cues.length; index += 1) {
        const cue = cues[index] as unknown as VTTCue;
        if (currentTime >= cue.startTime && currentTime <= cue.endTime && cue.text?.trim()) {
          const stripped = stripVttTags(cue.text).trim();
          if (stripped) return stripped;
        }
      }
    }
    return null;
  }, [currentTime, enabled, media, tick]);
}
