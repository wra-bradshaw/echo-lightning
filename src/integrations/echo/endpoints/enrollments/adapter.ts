import type { EchoGateway } from '../../../../domain';
import { createEndpoint } from '../create-endpoint';
import { decodeEnrollments } from './schema';
import { normalizeEnrollments } from './mapper';
import type { EchoTransport } from '../../transport/client';

export function createEnrollmentsEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getCourses'> {
  const getCourses = createEndpoint(transport, () => '/user/enrollments', decodeEnrollments, normalizeEnrollments);
  return {
    getCourses(options) {
      return getCourses([], options);
    },
  };
}
