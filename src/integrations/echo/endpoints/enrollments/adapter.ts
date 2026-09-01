import type { CancellationSignal, EchoGateway } from '../../../../domain';
import type { EchoRequestOptions, EchoTransport } from '../../transport/client';
import { decodeEnrollments, normalizeEnrollments } from './schema';

export function createEnrollmentsEndpoint(transport: EchoTransport): Pick<EchoGateway, 'getCourses'> {
  return {
    getCourses(options?: { signal?: CancellationSignal }) {
      const request: EchoRequestOptions | undefined = options ? { signal: options.signal as AbortSignal } : undefined;
      return transport.get('/user/enrollments', decodeEnrollments, request).then(normalizeEnrollments);
    },
  };
}
