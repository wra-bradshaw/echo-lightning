import { describe, expect, it, vi } from 'vitest';
import { parseQueryString, stringifyQueryString } from './query-string';

describe('parseQueryString', () => {
  it('parses an empty search string', () => {
    expect(parseQueryString('')).toEqual({});
    expect(parseQueryString('?')).toEqual({});
  });

  it('decodes typed scalar values', () => {
    expect(parseQueryString('?count=12&active=true&archived=false&name=Lecture%201')).toEqual({
      count: 12,
      active: true,
      archived: false,
      name: 'Lecture 1',
    });
  });

  it('treats plus as a space', () => {
    expect(parseQueryString('?q=hello+world')).toEqual({ q: 'hello world' });
  });

  it('collects repeated keys into arrays', () => {
    expect(parseQueryString('?id=1&id=2&id=3')).toEqual({ id: [1, 2, 3] });
  });

  it('keeps malformed escapes as raw text', () => {
    expect(parseQueryString('?q=%E0%A4%A')).toEqual({ q: '%E0%A4%A' });
  });

  it('parses without URLSearchParams iteration', () => {
    const original = globalThis.URLSearchParams;
    vi.stubGlobal('URLSearchParams', undefined);
    try {
      expect(parseQueryString('?a=1&b=x')).toEqual({ a: 1, b: 'x' });
    } finally {
      vi.stubGlobal('URLSearchParams', original);
    }
  });
});

describe('stringifyQueryString', () => {
  it('stringifies an empty record', () => {
    expect(stringifyQueryString({})).toBe('');
  });

  it('encodes values as form-urlencoded pairs', () => {
    expect(stringifyQueryString({ q: 'hello world', count: 2 })).toBe('?q=hello+world&count=2');
  });

  it('expands arrays into repeated keys and skips undefined', () => {
    expect(stringifyQueryString({ id: [1, 2], missing: undefined })).toBe('?id=1&id=2');
  });

  it('round-trips parsed search strings', () => {
    const parsed = parseQueryString('?section=abc&mode=focus&page=2');
    expect(stringifyQueryString(parsed)).toBe('?section=abc&mode=focus&page=2');
  });

  it('stringifies without URLSearchParams', () => {
    const original = globalThis.URLSearchParams;
    vi.stubGlobal('URLSearchParams', undefined);
    try {
      expect(stringifyQueryString({ a: 'x y' })).toBe('?a=x+y');
    } finally {
      vi.stubGlobal('URLSearchParams', original);
    }
  });
});
