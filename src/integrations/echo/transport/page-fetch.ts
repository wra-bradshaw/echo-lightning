import {
  PAGE_FETCH_REQUEST_EVENT,
  PAGE_FETCH_RESPONSE_EVENT,
  type PageFetchRequest,
  type PageFetchResponse,
} from './page-fetch-events';
import { headersToPairs } from '../../../platform/browser/headers';

let requestSequence = 0;

async function requestBody(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{
  request: Request;
  body?: string;
  keepalive: boolean;
}> {
  const request = new Request(input, init);
  const keepalive =
    Boolean((init as RequestInit & { keepalive?: boolean })?.keepalive) ||
    Boolean((request as Request & { keepalive?: boolean }).keepalive);
  if (request.method === 'GET' || request.method === 'HEAD') return { request, keepalive };
  return { request, body: await request.clone().text(), keepalive };
}

export function createPageFetch(target: Window = window): typeof fetch {
  return async (input, init) => {
    const resolvedInput = typeof input === 'string' ? new URL(input, target.location.href) : input;
    const { request, body, keepalive } = await requestBody(resolvedInput, init);
    const id = `request-${++requestSequence}`;
    const payload: PageFetchRequest = {
      id,
      url: request.url,
      method: request.method,
      headers: headersToPairs(request.headers),
      ...(body === undefined ? {} : { body }),
      ...(keepalive ? { keepalive: true } : {}),
    };

    return new Promise<Response>((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        target.document.removeEventListener(PAGE_FETCH_RESPONSE_EVENT, onResponse);
        request.signal.removeEventListener('abort', onAbort);
        callback();
      };
      const onAbort = () =>
        finish(() => reject(request.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')));
      const onResponse = (event: Event) => {
        let response: PageFetchResponse;
        try {
          response = JSON.parse(String((event as CustomEvent<string>).detail)) as PageFetchResponse;
        } catch {
          return;
        }
        if (response.id !== id) return;
        finish(() => {
          if (response.error) {
            reject(new TypeError(response.error));
            return;
          }
          resolve(new Response(response.body, { status: response.status, headers: response.headers }));
        });
      };

      target.document.addEventListener(PAGE_FETCH_RESPONSE_EVENT, onResponse);
      request.signal.addEventListener('abort', onAbort, { once: true });
      if (request.signal.aborted) {
        onAbort();
        return;
      }
      target.document.dispatchEvent(new CustomEvent(PAGE_FETCH_REQUEST_EVENT, { detail: JSON.stringify(payload) }));
    });
  };
}
