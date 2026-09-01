import { describe, expect, it } from 'vitest';
import { clampPipPosition, getPipCoordinates, placePipInNearestCorner, placePipStacks } from './pip-placement';

const viewport = { width: 1000, height: 700 };
const pip = { width: 240, height: 135 };

describe('PiP placement', () => {
  it('clamps dragged PiPs inside the viewport', () => {
    expect(clampPipPosition({ x: -40, y: 800 }, viewport, pip, 16)).toEqual({ x: 16, y: 549 });
    expect(clampPipPosition({ x: 700, y: 300 }, viewport, pip, 16)).toEqual({ x: 700, y: 300 });
  });

  it('snaps a dragged PiP to its nearest corner', () => {
    expect(placePipInNearestCorner({ x: 610, y: 500 }, viewport, pip, 16)).toEqual({
      corner: 'bottom-right',
      index: 0,
    });
  });

  it('stacks PiPs without overlap and flips a bottom stack upward', () => {
    expect(getPipCoordinates({ corner: 'bottom-right', index: 1 }, viewport, pip, 16, 12)).toEqual({
      x: 744,
      y: 402,
    });
  });

  it('preserves available requested stack positions while redistributing overflow', () => {
    expect(
      placePipStacks(
        ['camera-1', 'camera-2'],
        {
          'camera-1': { corner: 'top-left', index: 1 },
          'camera-2': { corner: 'top-left', index: 0 },
        },
        viewport,
        pip,
        16,
        12,
      ),
    ).toEqual({
      'camera-1': { corner: 'top-left', index: 1 },
      'camera-2': { corner: 'top-left', index: 0 },
    });
  });
});
