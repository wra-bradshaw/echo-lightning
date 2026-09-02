const SECRET_KEY = /(?:authorization|cookie|set-cookie|token|jwt|secret|password|passcode|signed)/i;
const ID_SEGMENT = /^(?:\d+|[a-f0-9]{8,}|[A-Za-z0-9_-]{20,})$/;
const ID_PRECEDER = new Set([
  'section',
  'lesson',
  'lessons',
  'classroom',
  'classrooms',
  'media',
  'session',
  'course',
  'courses',
  'playlist',
  'deck',
  'slide',
  'user',
  'notes',
]);
const STATIC_SEGMENT = new Set([
  'enrollments',
  'syllabus',
  'slides',
  'video',
  'content',
  'download',
  'me',
  'output',
  'check',
]);

export function structuralShape(value: unknown): unknown {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.slice(0, 3).map(structuralShape);
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value !== 'object') return typeof value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!SECRET_KEY.test(key)) output[key] = structuralShape(child);
  }
  return output;
}

export function sanitizeUrl(input: string | URL): string {
  const url = typeof input === 'string' ? new URL(input) : new URL(input.href);
  const segments = url.pathname.split('/').map((segment, index, all) => {
    const previous = all[index - 1]?.toLowerCase();
    return ID_SEGMENT.test(segment) ||
      (previous !== undefined && ID_PRECEDER.has(previous) && !STATIC_SEGMENT.has(segment.toLowerCase()))
      ? ':id'
      : segment;
  });
  return `${url.origin}${segments.join('/')}`;
}

export type DiscoveryRecord = {
  url?: string;
  method?: string;
  status?: number;
  resourceType?: string;
  response?: unknown;
  request?: unknown;
  [key: string]: unknown;
};

export function sanitizeDiscoveryRecord(record: DiscoveryRecord): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (record.url) result.url = sanitizeUrl(record.url);
  if (record.method) result.method = record.method.toUpperCase();
  if (typeof record.status === 'number') result.status = record.status;
  if (record.resourceType) result.resourceType = record.resourceType;
  if (record.response !== undefined) result.responseShape = structuralShape(record.response);
  if (record.request !== undefined) result.requestShape = structuralShape(record.request);
  return result;
}

export function sanitizeDiscovery(records: readonly DiscoveryRecord[]): Record<string, unknown>[] {
  return records.map(sanitizeDiscoveryRecord);
}
