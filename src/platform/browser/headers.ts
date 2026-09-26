export function headersToPairs(headers: Headers): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  headers.forEach((value, key) => {
    pairs.push([key, value]);
  });
  return pairs;
}
