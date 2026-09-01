import { describe, expect, it } from 'vitest';
import { canonicalEchoUrl, isReplacementRoute, parseEchoRoute, rewriteEchoInput, rewriteEchoOutput } from './routes';

describe('parseEchoRoute', () => {
  it('recognizes authentication locations', () =>
    expect(parseEchoRoute('https://login.echo360.net.au/login').kind).toBe('auth'));
  it('recognizes course, section, and classroom routes', () => {
    expect(parseEchoRoute('https://echo360.net.au/content').kind).toBe('courses');
    expect(parseEchoRoute('https://echo360.net.au/courses').kind).toBe('courses');
    expect(parseEchoRoute('https://echo360.net.au/section/abc').kind).toBe('section');
    expect(parseEchoRoute('https://echo360.net.au/lesson/lesson-1?tab=notes').kind).toBe('classroom');
  });
  it('normalizes Echo aliases and decodes route parameters', () => {
    expect(parseEchoRoute('https://echo360.net.au/home')).toEqual({
      kind: 'courses',
      url: 'https://echo360.net.au/home',
    });
    expect(parseEchoRoute('https://echo360.net.au/section/section%201/lessons/lesson%201')).toMatchObject({
      kind: 'classroom',
      sectionId: 'section 1',
      lessonId: 'lesson 1',
    });
    expect(parseEchoRoute('https://echo360.net.au/course/course%201/section/section%201')).toMatchObject({
      kind: 'section',
      courseId: 'course 1',
      sectionId: 'section 1',
    });
    expect(canonicalEchoUrl('https://echo360.net.au/lesson/lesson%201?tab=notes')).toBe(
      'https://echo360.net.au/classrooms/lesson%201',
    );
  });
  it('provides TanStack input and output rewrites', () => {
    expect(rewriteEchoInput({ url: new URL('https://echo360.net.au/home') })?.pathname).toBe('/courses');
    expect(rewriteEchoOutput({ url: new URL('https://echo360.net.au/sections/one') })?.pathname).toBe('/sections/one');
  });
  it('drops query strings from snapshots', () =>
    expect(parseEchoRoute('https://echo360.net.au/unknown?token=secret')).toEqual({
      kind: 'unsupported',
      url: 'https://echo360.net.au/unknown',
    }));
  it('does not claim routes from another origin', () =>
    expect(parseEchoRoute('https://example.com/courses')).toEqual({
      kind: 'unsupported',
      url: 'https://example.com/courses',
    }));
  it('only allows supported Echo routes for replacement', () => {
    expect(isReplacementRoute('https://echo360.net.au/content')).toBe(true);
    expect(isReplacementRoute('https://echo360.net.au/courses')).toBe(true);
    expect(isReplacementRoute('https://echo360.net.au/login')).toBe(false);
    expect(isReplacementRoute('https://echo360.net.au/unknown')).toBe(false);
  });
});
