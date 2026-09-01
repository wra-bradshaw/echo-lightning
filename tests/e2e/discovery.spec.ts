import { test } from './fixtures';
import { mkdir, writeFile } from 'node:fs/promises';
import { sanitizeDiscovery, type DiscoveryRecord } from '../../tools/echo-discovery/sanitize';

test('captures sanitized structural discovery metadata from clean Echo', async ({ cleanAuthenticatedContext }) => {
  const page = await cleanAuthenticatedContext.newPage();
  const records: DiscoveryRecord[] = [];
  const bodyReads: Promise<void>[] = [];
  page.on('response', (response) => {
    const request = response.request();
    const record: DiscoveryRecord = {
      url: response.url(),
      method: request.method(),
      status: response.status(),
      resourceType: request.resourceType(),
    };
    records.push(record);
    if (response.headers()['content-type']?.includes('json')) {
      bodyReads.push(
        response
          .json()
          .then((body) => {
            record.response = body;
          })
          .catch(() => undefined),
      );
    }
  });
  const baseUrl = process.env.ECHO360_BASE_URL?.trim() || 'https://echo360.net.au';
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await Promise.all(bodyReads);
    await mkdir('.discovery', { recursive: true });
    await writeFile('.discovery/network.json', JSON.stringify(sanitizeDiscovery(records), null, 2));
  } finally {
    await page.close();
  }
});
