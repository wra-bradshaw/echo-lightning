export const PIP_MIN_WIDTH = 148;
export const PIP_MIN_HEIGHT = 83;
const PIP_MAX_WIDTH = 480;
const PIP_VIEWPORT_MARGIN = 32;
const PIP_ASPECT_RATIO = 16 / 9;

export function getPipMaxWidth(viewport: { width: number; height: number }): number {
  const maxWidthByViewport = Math.max(PIP_MIN_WIDTH, viewport.width - PIP_VIEWPORT_MARGIN);
  const maxHeightByViewport = Math.max(PIP_MIN_HEIGHT, viewport.height - PIP_VIEWPORT_MARGIN);
  return Math.min(PIP_MAX_WIDTH, maxWidthByViewport, maxHeightByViewport * PIP_ASPECT_RATIO);
}

export function getPipHeight(width: number): number {
  return width / PIP_ASPECT_RATIO;
}
