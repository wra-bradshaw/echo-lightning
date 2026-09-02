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
    if (request.keepalive) {
      try {
        const url = new URL(request.url, target.location.href);
        if (url.origin !== target.location.origin) throw new TypeError('Page fetch requests must stay same-origin.');
        const beaconOk = (() => {
          try {
            if (typeof target.navigator.sendBeacon === 'function') {
              return target.navigator.sendBeacon(url.toString());
            }
          } catch {
            return false;
          }
          return false;
        })();
        if (!beaconOk) {
          void target
            .fetch(url, {
              method: request.method,
              headers: request.headers,
              body: request.body,
              credentials: 'include',
              keepalive: true,
            } as RequestInit & { keepalive: boolean })
            .catch(() => undefined);
        }
        sendResponse(target.document, {
          id: request.id,
          status: 200,
          headers: [],
          body: JSON.stringify({ status: 'ok' }),
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
      return;
    }
    void (async () => {
      try {
        const url = new URL(request.url, target.location.href);
        if (url.origin !== target.location.origin) throw new TypeError('Page fetch requests must stay same-origin.');
        const response = await target.fetch(url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          credentials: 'include',
          ...(request.keepalive ? ({ keepalive: true } as RequestInit & { keepalive: boolean }) : {}),
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
