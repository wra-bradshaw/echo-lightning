import type { EchoGateway } from '../../../../domain';
import { createEndpoint } from '../create-endpoint';
import { decodeSyllabus } from './schema';
import { normalizeSyllabus } from './mapper';
import type { EchoTransport } from '../../transport/client';

export function createSyllabusEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getSectionSyllabus'> {
  const getSectionSyllabus = createEndpoint(
    transport,
    (sectionId: string) => `/section/${encodeURIComponent(sectionId)}/syllabus`,
    decodeSyllabus,
    normalizeSyllabus,
  );
  return {
    getSectionSyllabus(sectionId, options) {
      return getSectionSyllabus([sectionId], options);
    },
  };
}
