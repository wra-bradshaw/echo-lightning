import { describe, expect, it } from 'vitest';
import { headersToPairs } from './headers';

describe('headersToPairs', () => {
  it('collects normalized header pairs', () => {
    const headers = new Headers({ 'Content-Type': 'application/json', 'X-Echo': '1' });
    expect(headersToPairs(headers)).toEqual([
      ['content-type', 'application/json'],
      ['x-echo', '1'],
    ]);
  });

  it('returns an empty array when no headers are present', () => {
    expect(headersToPairs(new Headers())).toEqual([]);
  });

  it('reads headers without iterating the entries iterator', () => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const entries = headers.entries.bind(headers);
    headers.entries = (() => ({})) as unknown as Headers['entries'];
    try {
      expect(headersToPairs(headers)).toEqual([['content-type', 'application/json']]);
    } finally {
      headers.entries = entries;
    }
  });
});
