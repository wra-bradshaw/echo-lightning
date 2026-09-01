import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import {
  PAGE_FETCH_REQUEST_EVENT,
  PAGE_FETCH_RESPONSE_EVENT,
  type PageFetchRequest,
  type PageFetchResponse,
} from '../integrations/echo/transport/page-fetch-events';

function sendResponse(target: Document, response: PageFetchResponse): void {
  target.dispatchEvent(new CustomEvent(PAGE_FETCH_RESPONSE_EVENT, { detail: JSON.stringify(response) }));
}

export function installPageFetchBridge(target: Window = window): void {
  const marker = '__echoLightningPageFetchBridgeInstalled';
  const page = target as Window & { [marker]?: boolean };
  if (page[marker]) return;
  page[marker] = true;
  target.document.addEventListener(PAGE_FETCH_REQUEST_EVENT, (event) => {
    const request = JSON.parse(String((event as CustomEvent<string>).detail)) as PageFetchRequest;
    void (async () => {
      try {
        const url = new URL(request.url, target.location.href);
        if (url.origin !== target.location.origin) throw new TypeError('Page fetch requests must stay same-origin.');
        const response = await target.fetch(url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          credentials: 'include',
        });
        sendResponse(target.document, {
          id: request.id,
          status: response.status,
          headers: Array.from(response.headers.entries()),
          body: await response.text(),
        });
      } catch (error) {
        sendResponse(target.document, {
          id: request.id,
          status: 0,
          headers: [],
          body: '',
          error: error instanceof Error ? error.message : 'Page fetch failed.',
        });
      }
    })();
  });
}

export default defineUnlistedScript(() => {
  installPageFetchBridge();
});
