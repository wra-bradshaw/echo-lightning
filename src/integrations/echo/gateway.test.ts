import { describe, expect, it, vi } from 'vitest';
import { InvalidResponseError } from './transport/client';
import { createEchoGateway } from './gateway';

describe('Echo gateway', () => {
  it('returns domain models instead of Echo wire records', async () => {
    const gateway = createEchoGateway({
      origin: 'https://echo360.net.au',
      fetcher: async () =>
        new Response(
          JSON.stringify({
            status: 'ok',
            data: [
              {
                userSections: [
                  { sectionId: 'section-1', courseId: 'course-1', courseName: 'Algorithms', sectionName: 'Example' },
                ],
                termsById: {},
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
    });

    await expect(gateway.getCourses()).resolves.toEqual([
      { id: 'section-1', sectionId: 'section-1', courseId: 'course-1', title: 'Algorithms', institution: 'Example' },
    ]);
  });

  it('saves an encoded media position as whole seconds', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    const gateway = createEchoGateway({ origin: 'https://echo360.net.au', fetcher });

    await expect(gateway.savePlayerPosition('media/id?part', 12.9)).resolves.toBeUndefined();

    const [url, options] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe(
      'https://echo360.net.au/api/ui/echoplayer/media%2Fid%3Fpart/last-played-to-seconds?seconds=12',
    );
    expect(options).toMatchObject({ method: 'POST', credentials: 'include' });
  });

  it('sends keepalive flag so the position survives page unload', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    const gateway = createEchoGateway({ origin: 'https://echo360.net.au', fetcher });

    await expect(gateway.savePlayerPosition('media-1', 12.9, { keepalive: true })).resolves.toBeUndefined();

    const [, options] = fetcher.mock.calls[0]!;
    expect(options).toMatchObject({ keepalive: true });
  });

  it('rejects an unsuccessful position response', async () => {
    const gateway = createEchoGateway({
      origin: 'https://echo360.net.au',
      fetcher: async () => new Response(JSON.stringify({ status: 'failed' }), { status: 200 }),
    });

    await expect(gateway.savePlayerPosition('media-1', 12)).rejects.toBeInstanceOf(InvalidResponseError);
  });
});
