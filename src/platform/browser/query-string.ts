function decodeComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function toValue(value: string): unknown {
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  return Number(value) * 0 === 0 && String(Number(value)) === value ? Number(value) : value;
}

function appendValue(target: Record<string, unknown>, key: string, value: unknown): void {
  const previous = target[key];
  if (previous === undefined) target[key] = value;
  else if (Array.isArray(previous)) previous.push(value);
  else target[key] = [previous, value];
}

export function parseQueryString(search: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return result;
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const separator = pair.indexOf('=');
    const rawKey = separator === -1 ? pair : pair.slice(0, separator);
    const rawValue = separator === -1 ? '' : pair.slice(separator + 1);
    appendValue(result, decodeComponent(rawKey), toValue(decodeComponent(rawValue)));
  }
  return result;
}

function encodeComponent(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function stringifyQueryString(params: Record<string, unknown>): string {
  const pairs: Array<string> = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) {
      pairs.push(`${encodeComponent(key)}=${encodeComponent(String(entry))}`);
    }
  }
  return pairs.length ? `?${pairs.join('&')}` : '';
}
