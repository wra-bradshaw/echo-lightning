import type { OriginalUiPort } from '../../domain';

export type OriginalUiRequest = OriginalUiPort;

export function useOriginalEchoUi(request: OriginalUiRequest, url?: string): Promise<void> {
  return request.useOriginal(url);
}
