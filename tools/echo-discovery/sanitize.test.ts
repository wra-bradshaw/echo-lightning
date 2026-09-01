import { describe, expect, it } from 'vitest';
import { sanitizeDiscoveryRecord, sanitizeUrl, structuralShape } from './sanitize';

describe('discovery sanitization', () => {
  it('removes query strings and identifier-like path segments', () =>
    expect(sanitizeUrl('https://echo360.net.au/section/12345/syllabus?token=secret')).toBe(
      'https://echo360.net.au/section/:id/syllabus',
    ));
  it('keeps a response shape but no values or secrets', () => {
    expect(structuralShape({ title: 'Private', token: 'secret', count: 2, nested: [{ ok: true }] })).toEqual({
      title: 'string',
      count: 'number',
      nested: [{ ok: 'boolean' }],
    });
    expect(
      sanitizeDiscoveryRecord({
        url: 'https://echo360.net.au/api/user/123',
        method: 'get',
        status: 200,
        headers: { authorization: 'secret' },
        response: { id: 'abc' },
      }),
    ).toEqual({
      url: 'https://echo360.net.au/api/user/:id',
      method: 'GET',
      status: 200,
      responseShape: { id: 'string' },
    });
  });
});
