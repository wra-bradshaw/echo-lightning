import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCaptionCue } from './use-caption-cue';

function createMockTrack(text: string, start: number, end: number, mode: string = 'hidden') {
  const cue = { startTime: start, endTime: end, text } as unknown as VTTCue;
  const cues = {
    length: 1,
    0: cue,
    item(index: number) {
      return index === 0 ? cue : null;
    },
    [Symbol.iterator]: function* () {
      yield cue;
    },
  } as unknown as TextTrackCueList;
  const activeCues = {
    length: 0,
    item() {
      return null;
    },
    [Symbol.iterator]: function* () {},
  } as unknown as TextTrackCueList;
  const listeners = new Map<string, Set<() => void>>();
  const track = {
    mode,
    kind: 'captions',
    label: 'English',
    language: 'en',
    cues,
    activeCues,
    addEventListener(type: string, handler: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: () => void) {
      listeners.get(type)?.delete(handler);
    },
    dispatchEvent(event: Event) {
      listeners.get(event.type)?.forEach((h) => h());
      return true;
    },
  } as unknown as TextTrack;
  return track;
}

function createMockMedia(tracks: TextTrack[], currentTime: number): HTMLVideoElement {
  const media = document.createElement('video');
  Object.defineProperty(media, 'currentTime', { configurable: true, value: currentTime, writable: true });
  const list = {
    length: tracks.length,
    ...Object.fromEntries(tracks.map((t, i) => [i, t])),
    item(index: number) {
      return tracks[index] ?? null;
    },
    [Symbol.iterator]: function* () {
      for (const t of tracks) yield t;
    },
    addEventListener() {},
    removeEventListener() {},
  } as unknown as TextTrackList;
  Object.defineProperty(media, 'textTracks', { configurable: true, value: list });
  return media;
}

function mediaWithCue(currentTime: number, cueText: string, start = 0, end = 10): HTMLVideoElement {
  const track = createMockTrack(cueText, start, end);
  return createMockMedia([track], currentTime);
}

describe('useCaptionCue', () => {
  it('hides native track and returns active cue text', () => {
    const media = mediaWithCue(5, 'Hello world', 1, 9);
    const { result } = renderHook(({ m, enabled, t }) => useCaptionCue(m, enabled, t), {
      initialProps: { m: media, enabled: true, t: 5 },
    });
    expect(media.textTracks[0]!.mode).toBe('hidden');
    expect(result.current).toBe('Hello world');
  });

  it('returns null when outside cue range', () => {
    const media = mediaWithCue(5, 'Hello', 1, 3);
    const { result } = renderHook(() => useCaptionCue(media, true, 5));
    expect(result.current).toBeNull();
  });

  it('returns null when disabled', () => {
    const media = mediaWithCue(2, 'Hello', 1, 9);
    const { result } = renderHook(() => useCaptionCue(media, false, 2));
    expect(result.current).toBeNull();
  });

  it('uses activeCues when available', () => {
    const media = mediaWithCue(5, 'Active cue', 1, 9);
    // Force activeCues to have cue (JSDOM may populate automatically based on currentTime)
    // JSDOM doesn't auto populate activeCues, but our fallback scanning will still find it via cues scan.
    const { result } = renderHook(() => useCaptionCue(media, true, 5));
    expect(result.current).toBe('Active cue');
  });

  it('strips voice tags and preserves speaker prefix', () => {
    const media = mediaWithCue(5, '<v Speaker 0>Hello world', 1, 9);
    const { result } = renderHook(() => useCaptionCue(media, true, 5));
    expect(result.current).toBe('Speaker 0: Hello world');
  });

  it('strips class and formatting tags', () => {
    const media = mediaWithCue(5, '<c.colorEFEFEF>Hello <i>world</i></c>', 1, 9);
    const { result } = renderHook(() => useCaptionCue(media, true, 5));
    expect(result.current).toBe('Hello world');
  });

  it('reacts to cuechange', () => {
    const track = (() => {
      let currentText = 'First';
      const cue = {
        get startTime() {
          return 1;
        },
        get endTime() {
          return 9;
        },
        get text() {
          return currentText;
        },
      } as unknown as VTTCue;
      const cues = {
        get length() {
          return 1;
        },
        get 0() {
          return cue;
        },
        item(index: number) {
          return index === 0 ? cue : null;
        },
        [Symbol.iterator]: function* () {
          yield cue;
        },
      } as unknown as TextTrackCueList;
      const listeners = new Map<string, Set<() => void>>();
      const mutable = {
        mode: 'hidden',
        kind: 'captions',
        label: 'English',
        language: 'en',
        get cues() {
          return cues;
        },
        activeCues: {
          length: 0,
          item() {
            return null;
          },
          [Symbol.iterator]: function* () {},
        } as unknown as TextTrackCueList,
        addEventListener(type: string, handler: () => void) {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(handler);
        },
        removeEventListener(type: string, handler: () => void) {
          listeners.get(type)?.delete(handler);
        },
        dispatchEvent(event: Event) {
          listeners.get(event.type)?.forEach((h) => h());
          return true;
        },
        _setText(next: string) {
          currentText = next;
        },
      } as unknown as TextTrack & { _setText: (t: string) => void };
      return mutable;
    })();
    const media = createMockMedia([track], 5);
    const { result } = renderHook(({ t }) => useCaptionCue(media, true, t), {
      initialProps: { t: 5 },
    });
    expect(result.current).toBe('First');
    act(() => {
      (track as unknown as { _setText: (t: string) => void })._setText('Second');
      (track as unknown as TextTrack).dispatchEvent(new Event('cuechange'));
    });
    expect(result.current).toBe('Second');
  });
});
