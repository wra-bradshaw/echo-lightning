import ky from 'ky';
import { sameOriginUrl } from '../routing/url';
import { AuthenticationError, EchoApiError, HttpError, InvalidResponseError, NetworkError } from './errors';

export type EchoRequestOptions = Omit<RequestInit, 'body' | 'signal'> & {
  body?: unknown;
  signal?: AbortSignal;
};

export type EchoDecoder<T> = (value: unknown) => T;

export class EchoTransport {
  readonly origin: string;
  private readonly client: typeof ky;

  constructor(
    origin = typeof location === 'undefined' ? 'https://echo360.net.au' : location.origin,
    fetcher: typeof fetch = fetch,
    private readonly onAuthenticationExpired?: () => Promise<void> | void,
  ) {
    this.origin = new URL(origin).origin;
    this.client = ky.create({
      credentials: 'include',
      fetch: async (input) => {
        const request = input as Request;
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && request.body !== null;
        const rawBody = hasBody ? await request.clone().text() : undefined;
        const body = rawBody === '' ? undefined : rawBody;
        return fetcher(new URL(request.url), {
          method: request.method,
          headers: request.headers,
          ...(body === undefined ? {} : { body }),
          credentials: request.credentials,
          signal: request.signal,
          ...(request.keepalive ? ({ keepalive: true } as RequestInit & { keepalive: boolean }) : {}),
        });
      },
      throwHttpErrors: false,
      hooks: {
        afterResponse: [
          async ({ response }) => {
            const redirectedToLogin =
              response.redirected && response.url && new URL(response.url).hostname === 'login.echo360.net.au';
            if (response.status === 401 || response.status === 403 || redirectedToLogin) {
              try {
                await this.onAuthenticationExpired?.();
              } catch (error) {
                void error;
              }
              throw new AuthenticationError();
            }
            if (response.url && new URL(response.url).origin !== this.origin)
              throw new TypeError('Echo API redirected off its same-origin endpoint.');
            return response;
          },
        ],
      },
    });
  }

  async request<T>(input: string | URL, decode: EchoDecoder<T>, options: EchoRequestOptions = {}): Promise<T> {
    const url = sameOriginUrl(input, this.origin);
    try {
      const { body, ...requestOptions } = options;
      const response = await this.client(url, {
        ...requestOptions,
        ...(body === undefined ? {} : { json: body }),
      });
      if (!response.ok) throw new HttpError(response.status);
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        throw new InvalidResponseError('Echo returned invalid JSON.', error);
      }
      try {
        return decode(payload);
      } catch (error) {
        throw new InvalidResponseError('Echo response did not match its schema.', error);
      }
    } catch (error) {
      if (error instanceof EchoApiError) throw error;
      if (error instanceof TypeError && error.message.includes('same-origin')) throw error;
      const wrapped = new NetworkError('Echo request failed.');
      wrapped.cause = error;
      throw wrapped;
    }
  }

  get<T>(path: string, decode: EchoDecoder<T>, options?: EchoRequestOptions): Promise<T> {
    return this.request(path, decode, { ...options, method: 'GET' });
  }

  post<T>(path: string, decode: EchoDecoder<T>, options?: EchoRequestOptions): Promise<T> {
    return this.request(path, decode, { ...options, method: 'POST' });
  }
}

export { AuthenticationError, InvalidResponseError } from './errors';
