const ECHO_HOST = 'echo360.net.au';

export function isEchoHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === ECHO_HOST || host.endsWith(`.${ECHO_HOST}`);
}

export function isEchoUrl(value: string | URL): boolean {
  try {
    const url = typeof value === 'string' ? new URL(value) : value;
    return (url.protocol === 'https:' || url.protocol === 'http:') && isEchoHost(url.hostname);
  } catch {
    return false;
  }
}

export function sameOriginUrl(input: string | URL, origin: string): URL {
  const base = new URL(origin);
  const url = new URL(input.toString(), base);
  if (url.origin !== base.origin) throw new TypeError(`Echo API requests must stay same-origin on ${base.origin}.`);
  return url;
}
