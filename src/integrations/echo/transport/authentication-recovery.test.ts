import { describe, expect, it, vi } from 'vitest';
import { AuthenticationError } from './errors';
import { createAuthenticationRecovery, handleAuthenticationError, officialLoginUrl } from './authentication-recovery';

describe('authentication recovery', () => {
  it('points expired sessions at official Echo login', async () => {
    expect(officialLoginUrl()).toBe('https://login.echo360.net.au/login');
    const sendMessage = vi.fn(async () => undefined);
    await expect(
      handleAuthenticationError(new AuthenticationError(), createAuthenticationRecovery(sendMessage)),
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(sendMessage).toHaveBeenCalledWith({ type: 'useOriginal', url: 'https://login.echo360.net.au/login' });
  });
});
