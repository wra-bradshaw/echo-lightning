export const LIGHTNING_RUNTIME_SCRIPT = 'content-scripts/lightning-runtime.js';

export interface RuntimeInjector {
  inject(tabId: number): Promise<void>;
  reset(tabId: number): void;
}

export function createRuntimeInjector(execute: (tabId: number) => Promise<unknown>): RuntimeInjector {
  const injected = new Set<number>();
  const pending = new Map<number, Promise<void>>();
  return {
    inject(tabId) {
      if (injected.has(tabId)) return Promise.resolve();
      const existing = pending.get(tabId);
      if (existing) return existing;
      const operation = execute(tabId)
        .then(() => {
          injected.add(tabId);
        })
        .finally(() => {
          pending.delete(tabId);
        });
      pending.set(tabId, operation);
      return operation;
    },
    reset(tabId) {
      injected.delete(tabId);
    },
  };
}
