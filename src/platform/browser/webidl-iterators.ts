type PairTarget = URLSearchParams | Headers;

function snapshotEntries(this: PairTarget): IterableIterator<[string, string]> {
  const pairs: Array<[string, string]> = [];
  this.forEach((value, key) => {
    pairs.push([key, value]);
  });
  return pairs.values();
}

function snapshotKeys(this: PairTarget): IterableIterator<string> {
  const keys: Array<string> = [];
  this.forEach((_value, key) => {
    keys.push(key);
  });
  return keys.values();
}

function snapshotValues(this: PairTarget): IterableIterator<string> {
  const values: Array<string> = [];
  this.forEach((value) => {
    values.push(value);
  });
  return values.values();
}

function iteratorBroken(factory: () => PairTarget): boolean {
  try {
    const iterator = factory().entries();
    return (
      iterator === null ||
      (typeof iterator !== 'object' && typeof iterator !== 'function') ||
      !(Symbol.iterator in iterator)
    );
  } catch {
    return true;
  }
}

export function ensureWebIdlIterators(): void {
  const prototypes: Array<{ create: () => PairTarget; prototype: URLSearchParams | Headers }> = [
    { create: () => new URLSearchParams(), prototype: URLSearchParams.prototype },
    { create: () => new Headers(), prototype: Headers.prototype },
  ];
  for (const { create, prototype } of prototypes) {
    if (!iteratorBroken(create)) continue;
    prototype.entries = snapshotEntries as typeof prototype.entries;
    prototype.keys = snapshotKeys as typeof prototype.keys;
    prototype.values = snapshotValues as typeof prototype.values;
  }
}
