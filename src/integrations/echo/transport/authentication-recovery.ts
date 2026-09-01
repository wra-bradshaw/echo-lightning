import { AuthenticationError } from './errors';

export const ECHO_LOGIN_URL = 'https://login.echo360.net.au/login';

export type AuthenticationHandler = {
  onExpired(): Promise<void> | void;
};

export async function handleAuthenticationError(error: unknown, handler: AuthenticationHandler): Promise<never> {
  if (error instanceof AuthenticationError) await handler.onExpired();
  throw error;
}

export function officialLoginUrl(baseUrl = 'https://echo360.net.au'): string {
  const base = new URL(baseUrl);
  return base.hostname.startsWith('login.') ? `${base.origin}${base.pathname || '/login'}` : ECHO_LOGIN_URL;
}

export function createAuthenticationRecovery(
  sendMessage: (message: { type: 'useOriginal'; url: string }) => Promise<unknown>,
  baseUrl?: string,
): AuthenticationHandler {
  return {
    onExpired: () => sendMessage({ type: 'useOriginal', url: officialLoginUrl(baseUrl) }).then(() => undefined),
  };
}
