import type { EchoGateway } from '../../domain';
import { createEnrollmentsEndpoint } from './endpoints/enrollments/adapter';
import { createPlayerPropertiesEndpoint } from './endpoints/player-properties/adapter';
import { createPlayerPositionEndpoint } from './endpoints/player-position/adapter';
import { createSyllabusEndpoint } from './endpoints/syllabus/adapter';
import { createAuthenticationRecovery } from './transport/authentication-recovery';
import { EchoTransport } from './transport/client';

export type EchoGatewayOptions = {
  origin: string;
  fetcher?: typeof fetch;
  onAuthenticationExpired?: () => Promise<void> | void;
};

export function createEchoGateway(options: EchoGatewayOptions): EchoGateway {
  const transport = new EchoTransport(options.origin, options.fetcher, options.onAuthenticationExpired);
  return {
    ...createEnrollmentsEndpoint(transport),
    ...createSyllabusEndpoint(transport),
    ...createPlayerPropertiesEndpoint(transport),
    ...createPlayerPositionEndpoint(transport),
  };
}

export function createAuthenticatedEchoGateway(options: {
  origin: string;
  sendMessage: (message: { type: 'useOriginal'; url: string }) => Promise<unknown>;
  fetcher?: typeof fetch;
}): EchoGateway {
  const recovery = createAuthenticationRecovery(options.sendMessage, options.origin);
  return createEchoGateway({ ...options, onAuthenticationExpired: recovery.onExpired });
}
