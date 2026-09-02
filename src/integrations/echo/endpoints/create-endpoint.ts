import type { EchoTransport } from '../transport/client';

type EndpointOptions = { signal?: AbortSignal };

type GetEndpoint<TParams extends readonly unknown[], TResult> = (
  params: TParams,
  options?: EndpointOptions,
) => Promise<TResult>;

export function createEndpoint<TParams extends readonly unknown[], TDecoded, TResult>(
  transport: EchoTransport,
  path: (...params: TParams) => string,
  decode: (payload: unknown) => TDecoded,
  map: (payload: TDecoded) => TResult,
): GetEndpoint<TParams, TResult> {
  return (params, options) =>
    transport.get(path(...params), decode, options ? { signal: options.signal } : undefined).then(map);
}
