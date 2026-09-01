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
});
