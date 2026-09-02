import type { EchoGateway } from '../../../../domain';
import { createEndpoint } from '../create-endpoint';
import { decodePlayerProperties } from './schema';
import { normalizePlayerProperties } from './mapper';
import type { EchoTransport } from '../../transport/client';

export function createPlayerPropertiesEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getPlayerProperties'> {
  const getPlayerProperties = createEndpoint(
    transport,
    (contextType: string, contextId: string, mediaId: string) =>
      `/api/ui/echoplayer/${encodeURIComponent(contextType)}/${encodeURIComponent(contextId)}/media/${encodeURIComponent(mediaId)}/player-properties`,
    decodePlayerProperties,
    normalizePlayerProperties,
  );
  return {
    getPlayerProperties(contextType, contextId, mediaId, options) {
      return getPlayerProperties([contextType, contextId, mediaId], options);
    },
  };
}
