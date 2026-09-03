import type { EchoGateway } from '../../../../domain';
import { decodeSyllabus } from './schema';
import { normalizeSyllabus } from './mapper';
import type { EchoTransport } from '../../transport/client';

export function createSyllabusEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getSectionSyllabus'> {
  return {
    getSectionSyllabus(sectionId, options) {
      return transport
        .get(
          `/section/${encodeURIComponent(sectionId)}/syllabus`,
          decodeSyllabus,
          options ? { signal: options.signal } : undefined,
        )
        .then(normalizeSyllabus);
    },
  };
}
