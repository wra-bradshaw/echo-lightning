import { describe, expect, it } from 'vitest';
import { createEchoGateway } from './gateway';

describe('Echo gateway', () => {
  it('returns domain models instead of Echo wire records', async () => {
    const gateway = createEchoGateway({
      origin: 'https://echo360.net.au',
      fetcher: async () =>
        new Response(JSON.stringify({ enrollments: [{ id: 12, name: 'Algorithms', institution: 'Example' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });

    await expect(gateway.getCourses()).resolves.toEqual([{ id: '12', title: 'Algorithms', institution: 'Example' }]);
  });
});
