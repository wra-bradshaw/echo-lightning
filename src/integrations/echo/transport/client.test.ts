import { describe, expect, it, vi } from 'vitest';
import { AuthenticationError, EchoTransport, InvalidResponseError } from './client';

const response = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

describe('Echo transport', () => {
  it('enforces same-origin credentials and decodes responses', async () => {
    const fetcher = vi.fn(async () => response({ ok: true }));
    const transport = new EchoTransport('https://echo360.net.au', fetcher);

    await expect(transport.get('https://other.example/api', (value) => value)).rejects.toThrow(/origin/);
    await expect(transport.get('/api', (value) => value)).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ credentials: 'include' }));
  });

  it('classifies authentication and decoder failures', async () => {
    await expect(
      new EchoTransport('https://echo360.net.au', async () => response({}, { status: 401 })).get(
        '/api',
        (value) => value,
      ),
    ).rejects.toBeInstanceOf(AuthenticationError);
    await expect(
      new EchoTransport('https://echo360.net.au', async () => response({ nope: true })).get('/api', () => {
        throw new Error('bad payload');
      }),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });
});
