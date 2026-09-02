import { describe, expect, it } from 'vitest';
import { decodePlayerProperties } from './schema';
import { normalizePlayerProperties } from './mapper';

describe('player properties schema', () => {
  it('selects the best video source for each camera and parses resume data', () => {
    const payload = decodePlayerProperties({
      status: 'ok',
      data: {
        mediaId: 'media-1',
        mediaName: 'Week 1 lecture',
        captions: 'https://captions.example.com/week-1.vtt',
        lastPlayedToSeconds: 125,
        playableAudioVideo: {
          duration: 'PT3295.050S',
          mediaId: 'media-1',
          playableMedias: [
            { sourceIndex: 0, trackType: ['Audio'], uri: 'https://content.example.com/s0_a.m3u8', isHls: true },
            { sourceIndex: 1, trackType: ['Video'], uri: 'https://content.example.com/s1_v.m3u8', isHls: true },
            {
              sourceIndex: 1,
              trackType: ['Audio', 'Video'],
              uri: 'https://content.example.com/s1_av.m3u8',
              isHls: true,
            },
            {
              sourceIndex: 2,
              trackType: ['Audio', 'Video'],
              uri: 'https://content.example.com/s2_av.m3u8',
              isHls: true,
            },
          ],
        },
      },
    });

    expect(normalizePlayerProperties(payload)).toEqual({
      mediaId: 'media-1',
      mediaName: 'Week 1 lecture',
      durationSeconds: 3295.05,
      positionSeconds: 125,
      sources: [
        {
          id: 'camera-1',
          label: 'Camera 1',
          src: 'https://content.example.com/s1_av.m3u8',
          type: 'application/vnd.apple.mpegurl',
        },
        {
          id: 'camera-2',
          label: 'Camera 2',
          src: 'https://content.example.com/s2_av.m3u8',
          type: 'application/vnd.apple.mpegurl',
        },
      ],
      captions: [
        { src: 'https://captions.example.com/week-1.vtt', kind: 'captions', label: 'English', language: 'en' },
      ],
    });
  });
});
