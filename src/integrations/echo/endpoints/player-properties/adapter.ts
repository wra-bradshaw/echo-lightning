import type { CancellationSignal, EchoGateway } from '../../../../domain';
import type { EchoRequestOptions, EchoTransport } from '../../transport/client';
import { decodePlayerProperties, normalizePlayerProperties } from './schema';

export function createPlayerPropertiesEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getPlayerProperties'> {
  return {
    getPlayerProperties(contextType, contextId, mediaId, options?: { signal?: CancellationSignal }) {
      const request: EchoRequestOptions | undefined = options ? { signal: options.signal as AbortSignal } : undefined;
      return transport
        .get(
          `/api/ui/echoplayer/${encodeURIComponent(contextType)}/${encodeURIComponent(contextId)}/media/${encodeURIComponent(mediaId)}/player-properties`,
          decodePlayerProperties,
          request,
        )
        .then(normalizePlayerProperties);
    },
  };
}
