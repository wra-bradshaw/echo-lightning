import type { EchoGateway } from '../../../../domain';
import type { EchoTransport } from '../../transport/client';
import { decodeSavePlayerPositionResponse } from './schema';

export function createPlayerPositionEndpoint(transport: EchoTransport): Pick<EchoGateway, 'savePlayerPosition'> {
  return {
    savePlayerPosition(mediaId, seconds, options) {
      if (!mediaId || !Number.isFinite(seconds))
        return Promise.reject(new TypeError('A valid media position is required.'));
      const wholeSeconds = Math.max(0, Math.floor(seconds));
      return transport
        .post(
          `/api/ui/echoplayer/${encodeURIComponent(mediaId)}/last-played-to-seconds?seconds=${wholeSeconds}`,
          decodeSavePlayerPositionResponse,
          options?.keepalive ? { keepalive: true } : undefined,
        )
        .then(() => undefined);
    },
  };
}
