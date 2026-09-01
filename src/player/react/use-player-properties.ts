import { useQuery } from '@tanstack/react-query';
import type { EchoGateway } from '../../domain';

export function usePlayerProperties(
  gateway: EchoGateway,
  contextType: string,
  contextId: string,
  mediaId: string,
  enabled = Boolean(contextType && contextId && mediaId),
) {
  return useQuery({
    queryKey: ['player-properties', contextType, contextId, mediaId],
    queryFn: ({ signal }) => gateway.getPlayerProperties(contextType, contextId, mediaId, { signal }),
    enabled,
  });
}
