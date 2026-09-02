import { describe, expect, it } from 'vitest';
import {
  MAX_PLAYER_VOLUME,
  PLAYER_VOLUME_SLIDER_STEP,
  playerVolumeToSliderValue,
  sliderValueToPlayerVolume,
} from './player-volume';

describe('player volume scale', () => {
  it('uses one-point slider increments', () => {
    expect(PLAYER_VOLUME_SLIDER_STEP).toBe(1);
  });

  it('maps the slider endpoints to 0% and 100%', () => {
    expect(sliderValueToPlayerVolume(0)).toBe(0);
    expect(sliderValueToPlayerVolume(100)).toBe(MAX_PLAYER_VOLUME);
  });

  it('round-trips useful volume percentages through the slider scale', () => {
    for (const volume of [0, 0.25, 0.5, 1]) {
      expect(sliderValueToPlayerVolume(playerVolumeToSliderValue(volume))).toBeCloseTo(volume, 8);
    }
  });

  it('uses linear steps across the range', () => {
    const lowVolumeStep = sliderValueToPlayerVolume(2) - sliderValueToPlayerVolume(1);
    const highVolumeStep = sliderValueToPlayerVolume(100) - sliderValueToPlayerVolume(99);

    expect(highVolumeStep).toBeCloseTo(lowVolumeStep, 8);
  });

  it('clamps values outside the slider range', () => {
    expect(sliderValueToPlayerVolume(-10)).toBe(0);
    expect(sliderValueToPlayerVolume(110)).toBe(MAX_PLAYER_VOLUME);
    expect(playerVolumeToSliderValue(-1)).toBe(0);
    expect(playerVolumeToSliderValue(2)).toBe(100);
  });
});
