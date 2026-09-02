import { afterEach, describe, expect, it, vi } from 'vitest';
import { installPageFetchBridge } from '../../../entrypoints/api-bridge';
import { createPageFetch } from './page-fetch';

describe('page fetch bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.replaceChildren();
  });

  it('forwards authenticated requests through the page world and rebuilds the response', async () => {
    const pageFetch = vi.fn<typeof fetch>(
      async () => new Response('{"ok":true}', { status: 200, headers: { 'x-source': 'page' } }),
    );
    vi.stubGlobal('fetch', pageFetch);
    installPageFetchBridge(window);

    const response = await createPageFetch(window)('/user/enrollments', {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get('x-source')).toBe('page');
    expect(pageFetch).toHaveBeenCalledOnce();
    const [url, options] = pageFetch.mock.calls[0]!;
    expect(String(url)).toBe('http://localhost:3000/user/enrollments');
    expect(options).toMatchObject({ credentials: 'include', method: 'GET' });
    expect(options?.headers).toEqual([['accept', 'application/json']]);
  });

  it('uses beacon or keepalive fetch for requests marked keepalive so they survive page unload', async () => {
    const pageFetch = vi.fn<typeof fetch>(async () => new Response('{"status":"ok"}', { status: 200 }));
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('fetch', pageFetch);
    Object.defineProperty(window.navigator, 'sendBeacon', { configurable: true, value: sendBeacon });
    installPageFetchBridge(window);

    const response = await createPageFetch(window)('/api/ui/echoplayer/media-1/last-played-to-seconds?seconds=12', {
      method: 'POST',
      keepalive: true,
    } as RequestInit & { keepalive: boolean });

    await expect(response.json()).resolves.toEqual({ status: 'ok' });
    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(String((sendBeacon.mock.calls[0] as unknown as [string])[0])).toContain('last-played-to-seconds?seconds=12');

    sendBeacon.mockReturnValue(false);
    await createPageFetch(window)('/api/ui/echoplayer/media-1/last-played-to-seconds?seconds=13', {
      method: 'POST',
      keepalive: true,
    } as RequestInit & { keepalive: boolean });
    expect(pageFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ keepalive: true, credentials: 'include', method: 'POST' }),
    );
  });
});
