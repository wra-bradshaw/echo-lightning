import { describe, expect, it } from 'vitest';
import { parseWebVtt } from './vtt';

describe('parseWebVtt', () => {
  it('decodes captions without retaining raw metadata', () => {
    expect(parseWebVtt('WEBVTT\n\n00:01.000 --> 00:03.500\nHello')).toEqual([{ start: 1, end: 3.5, text: 'Hello' }]);
  });

  it('strips voice and formatting tags', () => {
    expect(parseWebVtt('WEBVTT\n\n00:01.000 --> 00:03.500\n<v Speaker 0>Hello <c>world</c>')).toEqual([
      { start: 1, end: 3.5, text: 'Speaker 0: Hello world' },
    ]);
  });
});
