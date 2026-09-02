import { stripVttTags } from '../../shared/lib/strip-vtt-tags';
import type { TranscriptCue } from './index';

function timestamp(value: string): number {
  const parts = value.trim().replace(',', '.').split(':').map(Number);
  if (parts.length !== 2 && parts.length !== 3) return Number.NaN;
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return Number.NaN;
  return parts.length === 3 ? parts[0]! * 3600 + parts[1]! * 60 + parts[2]! : parts[0]! * 60 + parts[1]!;
}

export function parseWebVtt(source: string): TranscriptCue[] {
  const blocks = source.replace(/^WEBVTT[^\n]*\n?/, '').split(/\n{2,}/);
  return blocks.flatMap((block) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) return [];
    const [start, end] = lines[timingIndex]!.split('-->').map((part) => part.trim().split(/\s+/)[0]!);
    if (!start || !end) return [];
    const startTime = timestamp(start);
    const endTime = timestamp(end);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return [];
    const raw = lines.slice(timingIndex + 1).join('\n');
    const text = stripVttTags(raw);
    if (!text.trim()) return [];
    return [{ start: startTime, end: endTime, text }];
  });
}
