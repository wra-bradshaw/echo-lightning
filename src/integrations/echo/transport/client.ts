import { sameOriginUrl } from '../routing/url';
import { AuthenticationError, EchoApiError, HttpError, InvalidResponseError, NetworkError } from './errors';

export type EchoRequestOptions = Omit<RequestInit, 'body' | 'signal'> & {
  body?: unknown;
  signal?: AbortSignal;
};

export type EchoDecoder<T> = (value: unknown) => T;

export class EchoTransport {
  readonly origin: string;

  constructor(
    origin = typeof location === 'undefined' ? 'https://echo360.net.au' : location.origin,
    private readonly fetcher: typeof fetch = fetch,
    private readonly onAuthenticationExpired?: () => Promise<void> | void,
  ) {
    this.origin = new URL(origin).origin;
  }

  async request<T>(input: string | URL, decode: EchoDecoder<T>, options: EchoRequestOptions = {}): Promise<T> {
    const url = sameOriginUrl(input, this.origin);
    const headers = new Headers(options.headers);
    if (options.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');
    let response: Response;
    try {
      response = await this.fetcher(url, {
        ...options,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: 'include',
        headers,
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof EchoApiError) throw error;
      const wrapped = new NetworkError('Echo request failed.');
      wrapped.cause = error;
      throw wrapped;
    }
    const redirectedToLogin = (() => {
      if (!response.redirected || !response.url) return false;
      try {
        return new URL(response.url).hostname === 'login.echo360.net.au';
      } catch {
        return false;
      }
    })();
    if (response.status === 401 || response.status === 403 || redirectedToLogin) {
      try {
        await this.onAuthenticationExpired?.();
      } catch (error) {
        void error;
      }
      throw new AuthenticationError();
    }
    if (response.url) {
      try {
        if (new URL(response.url).origin !== this.origin)
          throw new TypeError('Echo API redirected off its same-origin endpoint.');
      } catch (error) {
        if (error instanceof TypeError) throw error;
      }
    }
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
  }

  get<T>(path: string, decode: EchoDecoder<T>, options?: EchoRequestOptions): Promise<T> {
    return this.request(path, decode, { ...options, method: 'GET' });
  }
}

export { AuthenticationError, EchoApiError, HttpError, InvalidResponseError, NetworkError } from './errors';
