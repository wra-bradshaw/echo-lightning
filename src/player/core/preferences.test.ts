import { describe, expect, it } from 'vitest';
import { restoreSelectedStreamIds } from './preferences';

describe('restoreSelectedStreamIds', () => {
  it('filters stale IDs while retaining the saved order', () => {
    expect(restoreSelectedStreamIds(['camera-1', 'camera-2', 'camera-3'], ['camera-3', 'stale', 'camera-1'])).toEqual([
      'camera-3',
      'camera-1',
    ]);
  });

  it('selects every available stream when there is no preference or no valid saved ID', () => {
    expect(restoreSelectedStreamIds(['camera-1', 'camera-2'], undefined)).toEqual(['camera-1', 'camera-2']);
    expect(restoreSelectedStreamIds(['camera-1', 'camera-2'], ['stale'])).toEqual(['camera-1', 'camera-2']);
    expect(restoreSelectedStreamIds(['camera-1', 'camera-2'], [])).toEqual(['camera-1', 'camera-2']);
  });

  it('does not select newly encountered IDs when a saved preference is valid', () => {
    expect(restoreSelectedStreamIds(['camera-1', 'camera-2', 'camera-3'], ['camera-2'])).toEqual(['camera-2']);
  });
});
