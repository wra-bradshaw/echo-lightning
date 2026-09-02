export const MAX_PLAYER_VOLUME = 1;
export const PLAYER_VOLUME_SLIDER_STEP = 1;

const MAX_SLIDER_VALUE = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sliderValueToPlayerVolume(sliderValue: number): number {
  const normalizedValue = clamp(sliderValue, 0, MAX_SLIDER_VALUE) / MAX_SLIDER_VALUE;
  return MAX_PLAYER_VOLUME * normalizedValue;
}

export function playerVolumeToSliderValue(volume: number): number {
  return (clamp(volume, 0, MAX_PLAYER_VOLUME) / MAX_PLAYER_VOLUME) * MAX_SLIDER_VALUE;
}
