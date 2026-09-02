export type PipCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type PipPosition = {
  corner: PipCorner;
  index: number;
};

export type ViewportSize = { width: number; height: number };
export type PipSize = { width: number; height: number };
export type Point = { x: number; y: number };

const PIP_CORNERS: readonly PipCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export function clampPipPosition(point: Point, viewport: ViewportSize, pip: PipSize, margin: number): Point {
  const maxX = Math.max(margin, viewport.width - pip.width - margin);
  const maxY = Math.max(margin, viewport.height - pip.height - margin);
  return {
    x: Math.min(maxX, Math.max(margin, point.x)),
    y: Math.min(maxY, Math.max(margin, point.y)),
  };
}

function cornerPoint(corner: PipCorner, viewport: ViewportSize, pip: PipSize, margin: number): Point {
  const right = viewport.width - pip.width - margin;
  const bottom = viewport.height - pip.height - margin;
  return {
    x: corner.endsWith('right') ? right : margin,
    y: corner.startsWith('bottom') ? bottom : margin,
  };
}

export function placePipInNearestCorner(
  point: Point,
  viewport: ViewportSize,
  pip: PipSize,
  margin: number,
): PipPosition {
  const clamped = clampPipPosition(point, viewport, pip, margin);
  return PIP_CORNERS.reduce<PipPosition>(
    (nearest, corner) => {
      const candidate = cornerPoint(corner, viewport, pip, margin);
      const nearestPoint = cornerPoint(nearest.corner, viewport, pip, margin);
      const distance = (candidate.x - clamped.x) ** 2 + (candidate.y - clamped.y) ** 2;
      const nearestDistance = (nearestPoint.x - clamped.x) ** 2 + (nearestPoint.y - clamped.y) ** 2;
      return distance < nearestDistance ? { corner, index: 0 } : nearest;
    },
    { corner: 'top-left', index: 0 },
  );
}

export function getPipCoordinates(
  position: PipPosition,
  viewport: ViewportSize,
  pip: PipSize,
  margin: number,
  gap: number,
): Point {
  const base = cornerPoint(position.corner, viewport, pip, margin);
  const offset = position.index * (pip.height + gap);
  return {
    x: base.x,
    y: position.corner.startsWith('bottom') ? base.y - offset : base.y + offset,
  };
}

export function placePipStacks(
  ids: readonly string[],
  requested: Readonly<Record<string, PipPosition | undefined>>,
  viewport: ViewportSize,
  pip: PipSize,
  margin: number,
  gap: number,
): Record<string, PipPosition> {
  const capacity = Math.max(1, Math.floor((viewport.height - margin * 2 + gap) / (pip.height + gap)));
  const occupied = new Map<PipCorner, Set<number>>(PIP_CORNERS.map((corner) => [corner, new Set<number>()]));
  const nextFreeIndex = (corner: PipCorner): number => {
    const slots = occupied.get(corner)!;
    for (let index = 0; index < capacity; index += 1) if (!slots.has(index)) return index;
    return slots.size;
  };
  const result: Record<string, PipPosition> = {};

  for (const id of ids) {
    const preference = requested[id];
    const preferred = preference?.corner ?? 'bottom-right';
    const preferredSlots = occupied.get(preferred)!;
    const requestedIndex = preference?.index;
    const hasRequestedSlot =
      requestedIndex !== undefined &&
      requestedIndex >= 0 &&
      requestedIndex < capacity &&
      !preferredSlots.has(requestedIndex);
    const corner = hasRequestedSlot
      ? preferred
      : preferredSlots.size < capacity
        ? preferred
        : PIP_CORNERS.reduce(
            (least, candidate) => (occupied.get(candidate)!.size < occupied.get(least)!.size ? candidate : least),
            'bottom-right',
          );
    const index = hasRequestedSlot ? requestedIndex! : nextFreeIndex(corner);
    occupied.get(corner)!.add(index);
    result[id] = { corner, index };
  }

  return result;
}
