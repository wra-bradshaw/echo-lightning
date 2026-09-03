export function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 1) return '';
  return toTimeString(seconds);
}

export function formatPlayerTime(seconds: number | undefined): string {
  if (!seconds || seconds < 1) return '0:00';
  return toTimeString(seconds);
}

export function formatDate(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function toTimeString(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainder}`;
}
