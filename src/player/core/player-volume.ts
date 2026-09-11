export const MAX_PLAYER_VOLUME = 10;
export const PLAYER_VOLUME_SLIDER_STEP = 5;

const MAX_SLIDER_VALUE = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sliderValueToPlayerVolume(sliderValue: number): number {
  const normalizedValue = clamp(sliderValue, 0, MAX_SLIDER_VALUE) / MAX_SLIDER_VALUE;
  return MAX_PLAYER_VOLUME * normalizedValue ** 2;
}

export function playerVolumeToSliderValue(volume: number): number {
  return Math.sqrt(clamp(volume, 0, MAX_PLAYER_VOLUME) / MAX_PLAYER_VOLUME) * MAX_SLIDER_VALUE;
}
