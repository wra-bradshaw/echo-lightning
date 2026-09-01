export function shouldCorrectMediaDrift(driftSeconds: number, thresholdSeconds = 0.25): boolean {
  return Math.abs(driftSeconds) > thresholdSeconds;
}

export function synchronizeSecondaryVideo(
  leader: Pick<HTMLMediaElement, 'currentTime'>,
  secondary: Pick<HTMLMediaElement, 'currentTime'>,
  thresholdSeconds = 0.25,
): boolean {
  const drift = secondary.currentTime - leader.currentTime;
  if (!shouldCorrectMediaDrift(drift, thresholdSeconds)) return false;
  secondary.currentTime = leader.currentTime;
  return true;
}
