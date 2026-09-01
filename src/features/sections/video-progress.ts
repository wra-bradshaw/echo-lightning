import type { SyllabusItem } from '../../domain';

export function getVideoMedia(lesson: SyllabusItem): SyllabusItem['media'][number] | undefined {
  return (
    lesson.media.find((media) => media.available !== false && !media.audioOnly) ??
    lesson.media.find((media) => media.available !== false)
  );
}

export function getWatchedPercentage(
  positionSeconds: number | undefined,
  durationSeconds: number | undefined,
  fallbackDurationSeconds?: number,
): number {
  const duration = [durationSeconds, fallbackDurationSeconds].find(
    (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
  );
  if (duration === undefined || typeof positionSeconds !== 'number' || !Number.isFinite(positionSeconds)) return 0;
  return Math.min(100, Math.max(0, (positionSeconds / duration) * 100));
}
