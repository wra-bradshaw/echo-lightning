import { describe, expect, it } from 'vitest';
import { isReplacementRoute, parseEchoRoute } from './routes';

describe('parseEchoRoute', () => {
  it('recognizes authentication locations', () =>
    expect(parseEchoRoute('https://login.echo360.net.au/login').kind).toBe('auth'));
  it('recognizes course, section, and classroom routes', () => {
    expect(parseEchoRoute('https://echo360.net.au/content').kind).toBe('courses');
    expect(parseEchoRoute('https://echo360.net.au/courses').kind).toBe('courses');
    expect(parseEchoRoute('https://echo360.net.au/section/abc').kind).toBe('section');
    expect(parseEchoRoute('https://echo360.net.au/lesson/lesson-1?tab=notes').kind).toBe('classroom');
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
