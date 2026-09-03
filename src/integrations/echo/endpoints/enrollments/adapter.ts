import type { EchoGateway } from '../../../../domain';
import { decodeEnrollments } from './schema';
import { normalizeEnrollments } from './mapper';
import type { EchoTransport } from '../../transport/client';

export function createEnrollmentsEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getCourses'> {
  return {
    getCourses(options) {
      return transport
        .get('/user/enrollments', decodeEnrollments, options ? { signal: options.signal } : undefined)
        .then(normalizeEnrollments);
    },
  };
}
