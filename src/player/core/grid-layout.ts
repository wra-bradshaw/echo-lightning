export type GridLayout = {
  rows: number;
  columns: number;
  tileWidth: number;
  tileHeight: number;
  score: number;
};

export type GridLayoutInput = {
  width: number;
  height: number;
  aspectRatios: readonly (number | undefined)[];
  gap?: number;
};

const FALLBACK_ASPECT_RATIO = 16 / 9;

function containedArea(width: number, height: number, aspectRatio: number): number {
  const containerRatio = width / height;
  if (containerRatio > aspectRatio) return height * height * aspectRatio;
  return width * (width / aspectRatio);
}

export function calculateGridLayout({ width, height, aspectRatios, gap = 12 }: GridLayoutInput): GridLayout {
  const count = aspectRatios.length;
  if (count === 0 || width <= 0 || height <= 0) {
    return { rows: 0, columns: 0, tileWidth: 0, tileHeight: 0, score: 0 };
  }

  const ratios = aspectRatios.map((ratio) =>
    ratio && Number.isFinite(ratio) && ratio > 0 ? ratio : FALLBACK_ASPECT_RATIO,
  );
  let best: GridLayout | undefined;

  for (let rows = 1; rows <= count; rows += 1) {
    const columns = Math.ceil(count / rows);
    const tileWidth = (width - gap * (columns - 1)) / columns;
    const tileHeight = (height - gap * (rows - 1)) / rows;
    if (tileWidth <= 0 || tileHeight <= 0) continue;
    const score = ratios.reduce((total, ratio) => total + containedArea(tileWidth, tileHeight, ratio), 0);
    const adjustedScore = columns > rows ? score * 1.2 : score;
    const candidate = { rows, columns, tileWidth, tileHeight, score: adjustedScore };
    if (!best || adjustedScore > best.score || (adjustedScore === best.score && rows < best.rows)) best = candidate;
  }

  return best ?? { rows: 0, columns: 0, tileWidth: 0, tileHeight: 0, score: 0 };
}

export { FALLBACK_ASPECT_RATIO };
