import { execFile } from 'node:child_process';
import type { Page } from '@playwright/test';

const RBW_MAX_BUFFER = 16 * 1024;
const AUTH_TIMEOUT = 60_000;

type Credentials = { email: string; username: string; password: string };

function item(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}; set it to an rbw item name.`);
  }
  return value;
}

function rbw(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('rbw', args, { encoding: 'utf8', maxBuffer: RBW_MAX_BUFFER }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });
}

async function rbwValue(args: string[], description: string): Promise<string> {
  try {
    const value = await rbw(args);
    if (!value) throw new Error('empty');
    return value;
  } catch {
    throw new Error(`Unable to read ${description} from rbw.`);
  }
}

async function credentials(): Promise<Credentials> {
  const login = item('ECHO360_LOGIN_RBW_ITEM');
  const sso = item('ECHO360_SSO_RBW_ITEM');

  try {
    await rbw(['unlocked']);
  } catch {
    throw new Error('rbw is locked or unavailable; unlock it before starting Playwright.');
  }

  const [email, username, password] = await Promise.all([
    rbwValue(['get', '--field', 'username', login], 'the Echo360 email'),
    rbwValue(['get', '--field', 'username', sso], 'the SSO username'),
    rbwValue(['get', '--field', 'password', sso], 'the SSO password'),
  ]);
  return { email, username, password };
}

async function totp(): Promise<string> {
  const code = await rbwValue(['code', item('ECHO360_SSO_RBW_ITEM')], 'the SSO 2FA code');
  if (!/^\d{4,8}$/.test(code)) throw new Error('rbw returned an invalid SSO 2FA code.');
  return code;
}

export async function authenticateEcho360(page: Page): Promise<void> {
  const baseUrl = process.env.ECHO360_BASE_URL?.trim() || 'https://echo360.net.au';
  const loginUrl = process.env.ECHO360_LOGIN_URL?.trim() || 'https://login.echo360.net.au/login';
  const echoHost = new URL(baseUrl).hostname;
  const auth = await credentials();

  try {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill(auth.email);
    await page.locator('#submitBtn').click();

    const username = page.locator('input[autocomplete="username"]');
    await username.waitFor({ state: 'visible' });
    await username.fill(auth.username);
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await page.locator('a[data-se="button"][aria-label="Select Password."]').click();
    const password = page.locator('input[name="credentials.passcode"]');
    await password.waitFor({ state: 'visible' });
    await password.fill(auth.password);
    await page.getByRole('button', { name: 'Verify', exact: true }).click();

    await page.locator('a[data-se="button"][aria-label="Select Google Authenticator."]').click();
    const code = await totp();
    const otp = page.locator('input[name="credentials.passcode"]');
    await otp.waitFor({ state: 'visible' });
    await otp.fill(code);
    await page.getByRole('button', { name: 'Verify', exact: true }).click();

    const isEcho360 = (): boolean => {
      const url = new URL(page.url());
      return url.hostname === echoHost && !/^\/login(?:\/|$)/i.test(url.pathname);
    };
    if (!isEcho360()) {
      await page.waitForURL((url) => url.hostname === echoHost && !/^\/login(?:\/|$)/i.test(url.pathname), {
        timeout: AUTH_TIMEOUT,
      });
    }
  } finally {
    auth.email = '';
    auth.username = '';
    auth.password = '';
  }
}
