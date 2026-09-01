import { describe, expect, it } from 'vitest';
import { getWatchedPercentage } from './video-progress';

describe('video progress', () => {
  it('calculates the watched percentage from position and duration', () => {
    expect(getWatchedPercentage(150, 600)).toBe(25);
  });

  it('uses the fallback duration when player properties do not provide one', () => {
    expect(getWatchedPercentage(150, undefined, 600)).toBe(25);
  });

  it('clamps progress to the valid percentage range', () => {
    expect(getWatchedPercentage(-10, 600)).toBe(0);
    expect(getWatchedPercentage(700, 600)).toBe(100);
  });

  it('returns zero when the duration or position is unavailable', () => {
    expect(getWatchedPercentage(150, 0)).toBe(0);
    expect(getWatchedPercentage(undefined, 600)).toBe(0);
  });
});
