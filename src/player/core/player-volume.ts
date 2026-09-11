export const MAX_PLAYER_VOLUME = 10;
export const PLAYER_VOLUME_SLIDER_STEP = 5;

const MAX_SLIDER_VALUE = 100;
const UNITY_SLIDER_VALUE = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sliderValueToPlayerVolume(sliderValue: number): number {
  const clamped = clamp(sliderValue, 0, MAX_SLIDER_VALUE);
  if (clamped <= UNITY_SLIDER_VALUE) return clamped / UNITY_SLIDER_VALUE;
  const boost = (clamped - UNITY_SLIDER_VALUE) / UNITY_SLIDER_VALUE;
  return 1 + (MAX_PLAYER_VOLUME - 1) * boost ** 2;
}

export function playerVolumeToSliderValue(volume: number): number {
  const clamped = clamp(volume, 0, MAX_PLAYER_VOLUME);
  if (clamped <= 1) return clamped * UNITY_SLIDER_VALUE;
  return UNITY_SLIDER_VALUE + UNITY_SLIDER_VALUE * Math.sqrt((clamped - 1) / (MAX_PLAYER_VOLUME - 1));
}
