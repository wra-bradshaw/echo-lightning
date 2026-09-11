import { describe, expect, it } from 'vitest';
import { MAX_PLAYER_VOLUME, playerVolumeToSliderValue, sliderValueToPlayerVolume } from './player-volume';

describe('sliderValueToPlayerVolume', () => {
  it('maps silence to zero', () => {
    expect(sliderValueToPlayerVolume(0)).toBe(0);
  });

  it('maps the midpoint step to exactly 100%', () => {
    expect(sliderValueToPlayerVolume(50)).toBe(1);
  });

  it('maps the top step to the maximum boost', () => {
    expect(sliderValueToPlayerVolume(100)).toBe(MAX_PLAYER_VOLUME);
  });

  it('scales linearly below unity in exact 10% steps', () => {
    expect(sliderValueToPlayerVolume(45)).toBe(0.9);
    expect(sliderValueToPlayerVolume(5)).toBe(0.1);
  });

  it('boosts quadratically above unity', () => {
    expect(sliderValueToPlayerVolume(55)).toBeCloseTo(1.09, 10);
    expect(sliderValueToPlayerVolume(75)).toBeCloseTo(3.25, 10);
  });

  it('clamps outside the slider range', () => {
    expect(sliderValueToPlayerVolume(-5)).toBe(0);
    expect(sliderValueToPlayerVolume(150)).toBe(MAX_PLAYER_VOLUME);
  });
});

describe('playerVolumeToSliderValue', () => {
  it('maps unity to the midpoint step exactly', () => {
    expect(playerVolumeToSliderValue(1)).toBe(50);
  });

  it('inverts every step on the slider grid', () => {
    for (let slider = 0; slider <= 100; slider += 5) {
      expect(playerVolumeToSliderValue(sliderValueToPlayerVolume(slider))).toBeCloseTo(slider, 8);
    }
  });

  it('clamps outside the volume range', () => {
    expect(playerVolumeToSliderValue(-1)).toBe(0);
    expect(playerVolumeToSliderValue(MAX_PLAYER_VOLUME + 5)).toBe(100);
  });
});
