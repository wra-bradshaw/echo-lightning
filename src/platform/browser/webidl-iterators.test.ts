import { afterEach, describe, expect, it } from 'vitest';
import { ensureWebIdlIterators } from './webidl-iterators';

const paramsEntries = URLSearchParams.prototype.entries;
const headersEntries = Headers.prototype.entries;

function breakEntries() {
  const broken = function (this: URLSearchParams | Headers) {
    const pairs: Array<[string, string]> = [];
    this.forEach((value, key) => pairs.push([key, value]));
    return {} as IterableIterator<[string, string]>;
  };
  URLSearchParams.prototype.entries = broken as typeof paramsEntries;
  Headers.prototype.entries = broken as typeof headersEntries;
}

afterEach(() => {
  URLSearchParams.prototype.entries = paramsEntries;
  Headers.prototype.entries = headersEntries;
});

describe('ensureWebIdlIterators', () => {
  it('leaves working iterators untouched', () => {
    ensureWebIdlIterators();
    expect(URLSearchParams.prototype.entries).toBe(paramsEntries);
    expect(Headers.prototype.entries).toBe(headersEntries);
  });

  it('restores iteration over search params without the iterator protocol', () => {
    breakEntries();
    ensureWebIdlIterators();
    expect(Array.from(new URLSearchParams('a=1&b=2').entries())).toEqual([
      ['a', '1'],
      ['b', '2'],
    ]);
  });

  it('restores iteration over headers without the iterator protocol', () => {
    breakEntries();
    ensureWebIdlIterators();
    expect(Array.from(new Headers({ 'x-echo': '1' }).entries())).toEqual([['x-echo', '1']]);
  });
});
