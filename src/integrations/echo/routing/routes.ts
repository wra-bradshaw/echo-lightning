import { isEchoHost } from './url';

export type EchoRoute =
  | { kind: 'auth'; url: string }
  | { kind: 'courses'; courseId?: string; url: string }
  | { kind: 'section'; sectionId: string; courseId?: string; url: string }
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
  const nestedCourseLesson = path.match(
    /^\/(?:content|courses?)\/([^/]+)\/(?:sections?)\/([^/]+)\/(?:lessons?|classrooms?)\/([^/]+)/i,
  );
  if (nestedCourseLesson) {
    return {
      kind: 'classroom',
      sectionId: routeId(nestedCourseLesson[2]!),
      lessonId: routeId(nestedCourseLesson[3]!),
      url: normalized,
    };
  }
  const nestedSectionLesson = path.match(/^\/(?:sections?|section-home)\/([^/]+)\/(?:lessons?|classrooms?)\/([^/]+)/i);
  if (nestedSectionLesson) {
    return {
      kind: 'classroom',
      sectionId: routeId(nestedSectionLesson[1]!),
      lessonId: routeId(nestedSectionLesson[2]!),
      url: normalized,
    };
  }
  const nestedCourseSection = path.match(/^\/(?:content|courses?)\/([^/]+)\/(?:sections?)\/([^/]+)/i);
  if (nestedCourseSection) {
    return {
      kind: 'section',
      courseId: routeId(nestedCourseSection[1]!),
      sectionId: routeId(nestedCourseSection[2]!),
      url: normalized,
    };
  }
  const course = path.match(/^(?:\/(?:content|courses?))\/([^/]+)/i);
  if (course) return { kind: 'courses', courseId: routeId(course[1]!), url: normalized };
  if (/^\/(?:content|courses?|user\/enrollments|home)?$/i.test(path)) {
    return { kind: 'courses', url: normalized };
  }
  const classroom = path.match(/^\/(?:classrooms?|lesson|lessons)\/([^/]+)/i);
  if (classroom) return { kind: 'classroom', lessonId: routeId(classroom[1]!), url: normalized };
  const section = path.match(/^\/(?:sections?|section-home)\/([^/]+)/i);
  if (section) return { kind: 'section', sectionId: routeId(section[1]!), url: normalized };
  return { kind: 'unsupported', url: normalized };
}

export function canonicalEchoPath(route: EchoRoute): string {
  if (route.kind === 'courses') return route.courseId ? `/courses/${encodeURIComponent(route.courseId)}` : '/courses';
  if (route.kind === 'section') return `/section/${encodeURIComponent(route.sectionId)}/home`;
  if (route.kind === 'classroom') {
    return route.sectionId
      ? `/section/${encodeURIComponent(route.sectionId)}/lesson/${encodeURIComponent(route.lessonId)}`
      : `/lesson/${encodeURIComponent(route.lessonId)}`;
  }
  return new URL(route.url, 'https://echo360.net.au').pathname;
}

export function canonicalEchoUrl(input: string | URL): string {
  const route = parseEchoRoute(input);
  if (route.kind === 'unsupported' || route.kind === 'auth') return route.url;
  const url = new URL(route.url);
  url.pathname = canonicalEchoPath(route);
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function stockEchoPath(route: EchoRoute): string {
  if (route.kind === 'courses') return route.courseId ? `/courses/${encodeURIComponent(route.courseId)}` : '/courses';
  if (route.kind === 'section') return `/section/${encodeURIComponent(route.sectionId)}/home`;
  if (route.kind === 'classroom') return `/lesson/${encodeURIComponent(route.lessonId)}`;
  return new URL(route.url, 'https://echo360.net.au').pathname;
}

export function stockEchoUrl(input: string | URL): string {
  const route = parseEchoRoute(input);
  if (route.kind === 'unsupported' || route.kind === 'auth') return route.url;
  const url = new URL(route.url);
  url.pathname = stockEchoPath(route);
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function rewriteEchoInput({ url }: { url: URL }): URL | undefined {
  const route = parseEchoRoute(
    isEchoHost(url.hostname) ? url : new URL(url.href.replace(url.origin, 'https://echo360.net.au')),
  );
  if (route.kind === 'unsupported' || route.kind === 'auth') return undefined;
  const rewritten = new URL(url.href);
  rewritten.pathname = canonicalEchoPath(route);
  return rewritten;
}

export function rewriteEchoOutput({ url }: { url: URL }): URL | undefined {
  const rewritten = new URL(url.href);
  const route = parseEchoRoute(
    isEchoHost(url.hostname) ? url : new URL(url.href.replace(url.origin, 'https://echo360.net.au')),
  );
  if (route.kind !== 'unsupported' && route.kind !== 'auth') rewritten.pathname = canonicalEchoPath(route);
  return rewritten;
}

export function isEchoAuthUrl(input: string | URL): boolean {
  return parseEchoRoute(input).kind === 'auth';
}

export function isReplacementRoute(input: string | URL): boolean {
  const kind = parseEchoRoute(input).kind;
  return kind === 'courses' || kind === 'section' || kind === 'classroom';
}
