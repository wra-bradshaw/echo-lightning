import type { CancellationSignal, EchoGateway } from '../../../../domain';
import type { EchoRequestOptions, EchoTransport } from '../../transport/client';
import { decodeSyllabus, normalizeSyllabus } from './schema';

export function createSyllabusEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getSectionSyllabus'> {
  return {
    getSectionSyllabus(sectionId, options?: { signal?: CancellationSignal }) {
      const request: EchoRequestOptions | undefined = options ? { signal: options.signal as AbortSignal } : undefined;
      return transport
        .get(`/section/${encodeURIComponent(sectionId)}/syllabus`, decodeSyllabus, request)
        .then(normalizeSyllabus);
    },
  };
}
