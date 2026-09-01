import { describe, expect, it } from 'vitest';
import { shouldCorrectMediaDrift, synchronizeSecondaryVideo } from './media-sync';

describe('media synchronization', () => {
  it('corrects only meaningful drift', () => {
    const leader = { currentTime: 10 };
    const secondary = { currentTime: 10.1 };
    expect(shouldCorrectMediaDrift(0.1)).toBe(false);
    expect(synchronizeSecondaryVideo(leader, secondary)).toBe(false);
    secondary.currentTime = 11;
    expect(synchronizeSecondaryVideo(leader, secondary)).toBe(true);
    expect(secondary.currentTime).toBe(10);
  });
});
