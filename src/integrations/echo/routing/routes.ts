import { isEchoHost } from './url';

export type EchoRoute =
  | { kind: 'auth'; url: string }
  | { kind: 'courses'; courseId?: string; url: string }
  | { kind: 'section'; sectionId: string; url: string }
  | { kind: 'classroom'; lessonId: string; sectionId?: string; url: string }
  | { kind: 'unsupported'; url: string };

const clean = (url: URL): string => `${url.origin}${url.pathname}`;
const routeId = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export function parseEchoRoute(input: string | URL): EchoRoute {
  let url: URL;
  try {
    url = typeof input === 'string' ? new URL(input) : new URL(input.href);
  } catch {
    return { kind: 'unsupported', url: String(input) };
  }
  if (!isEchoHost(url.hostname)) return { kind: 'unsupported', url: clean(url) };
  const path = url.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  const normalized = clean(url);
  if (
    url.hostname.toLowerCase().startsWith('login.') ||
    /^\/(?:auth\/)?(?:login|logout|callback|authorize|sso)(?:\/|$)/i.test(path)
  ) {
    return { kind: 'auth', url: normalized };
  }
  const course = path.match(/^\/courses?\/([^/]+)/i);
  if (course) return { kind: 'courses', courseId: routeId(course[1]!), url: normalized };
  if (/^\/(?:content|courses?|user\/enrollments|home)?$/i.test(path) || /^\/courses?(?:\/)?$/i.test(path)) {
    return { kind: 'courses', url: normalized };
  }
  const classroom = path.match(/^\/(?:classrooms?|lesson|lessons)\/([^/]+)/i);
  if (classroom) return { kind: 'classroom', lessonId: routeId(classroom[1]!), url: normalized };
  const nestedLesson = path.match(/^\/section\/([^/]+)\/(?:lesson|classroom)\/([^/]+)/i);
  if (nestedLesson) {
    return {
      kind: 'classroom',
      sectionId: routeId(nestedLesson[1]!),
      lessonId: routeId(nestedLesson[2]!),
      url: normalized,
    };
  }
  const section = path.match(/^\/(?:sections?|section-home)\/([^/]+)/i);
  if (section) return { kind: 'section', sectionId: routeId(section[1]!), url: normalized };
  return { kind: 'unsupported', url: normalized };
}

export function isEchoAuthUrl(input: string | URL): boolean {
  return parseEchoRoute(input).kind === 'auth';
}

export function isReplacementRoute(input: string | URL): boolean {
  const kind = parseEchoRoute(input).kind;
  return kind === 'courses' || kind === 'section' || kind === 'classroom';
}
