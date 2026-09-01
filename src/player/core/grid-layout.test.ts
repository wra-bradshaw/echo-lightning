import { describe, expect, it } from 'vitest';
import { calculateGridLayout } from './grid-layout';

describe('calculateGridLayout', () => {
  it('chooses the arrangement with the greatest contained video area', () => {
    const layout = calculateGridLayout({
      width: 1200,
      height: 700,
      aspectRatios: [16 / 9, 4 / 3, 9 / 16, 16 / 9],
      gap: 12,
    });

    expect(layout.rows * layout.columns).toBeGreaterThanOrEqual(4);
    expect(layout.rows).toBe(2);
    expect(layout.columns).toBe(2);
    expect(layout.tileWidth).toBeGreaterThan(500);
    expect(layout.tileHeight).toBeGreaterThan(300);
  });

  it('falls back to 16:9 and recalculates for a narrow viewport', () => {
    const layout = calculateGridLayout({
      width: 390,
      height: 720,
      aspectRatios: [undefined, undefined, undefined],
      gap: 8,
    });

    expect(layout.rows).toBe(3);
    expect(layout.columns).toBe(1);
    expect(layout.tileWidth).toBe(390);
    expect(layout.tileHeight).toBeCloseTo((720 - 16) / 3);
    expect(layout.score).toBeGreaterThan(0);
  });

  it('returns an empty layout without streams', () => {
    expect(calculateGridLayout({ width: 800, height: 500, aspectRatios: [] })).toEqual({
      rows: 0,
      columns: 0,
      tileWidth: 0,
      tileHeight: 0,
      score: 0,
    });
  });
});
