import type { EchoGateway } from '../../../../domain';
import { decodePlayerProperties } from './schema';
import { normalizePlayerProperties } from './mapper';
import type { EchoTransport } from '../../transport/client';

export function createPlayerPropertiesEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getPlayerProperties'> {
  return {
    getPlayerProperties(contextType, contextId, mediaId, options) {
      return transport
        .get(
          `/api/ui/echoplayer/${encodeURIComponent(contextType)}/${encodeURIComponent(contextId)}/media/${encodeURIComponent(mediaId)}/player-properties`,
          decodePlayerProperties,
          options ? { signal: options.signal } : undefined,
        )
        .then(normalizePlayerProperties);
    },
  };
}
