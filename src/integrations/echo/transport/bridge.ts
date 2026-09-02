import {
  PAGE_FETCH_REQUEST_EVENT,
  PAGE_FETCH_RESPONSE_EVENT,
  type PageFetchRequest,
  type PageFetchResponse,
} from './page-fetch-events';

function sendResponse(target: Window, response: PageFetchResponse): void {
  target.document.dispatchEvent(new CustomEvent(PAGE_FETCH_RESPONSE_EVENT, { detail: JSON.stringify(response) }));
}

export function installPageFetchBridge(target: Window = window): void {
  const marker = '__echoLightningPageFetchBridgeInstalled';
  const page = target as Window & { [marker]?: boolean };
  if (page[marker]) return;
  page[marker] = true;
  target.document.addEventListener(PAGE_FETCH_REQUEST_EVENT, (event) => {
    let request: PageFetchRequest;
    try {
      request = JSON.parse(String((event as CustomEvent<string>).detail)) as PageFetchRequest;
    } catch {
      return;
    }
    void (async () => {
      try {
        const url = new URL(request.url, target.location.href);
        if (url.origin !== target.location.origin) throw new TypeError('Page fetch requests must stay same-origin.');
        if (request.keepalive) {
          const beacon = new Blob([request.body ?? ''], { type: 'application/json' });
          const sent = typeof target.navigator.sendBeacon === 'function' && target.navigator.sendBeacon(url, beacon);
          if (!sent) {
            void target.fetch(url, {
              method: request.method,
              headers: request.headers,
              body: request.body,
              credentials: 'include',
              keepalive: true,
            } as RequestInit & { keepalive: boolean });
          }
          sendResponse(target, { id: request.id, status: 200, headers: [], body: JSON.stringify({ status: 'ok' }) });
          return;
        }
        const response = await target.fetch(url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          credentials: 'include',
        });
        sendResponse(target, {
          id: request.id,
          status: response.status,
          headers: Array.from(response.headers.entries()),
          body: await response.text(),
        });
      } catch (error) {
        sendResponse(target, {
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
