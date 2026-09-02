export type PipCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type PipPosition = { corner: PipCorner; index: number };
export type PipSize = { width: number; height: number };
export type PlayerMode = 'grid' | 'focus';
export type PlayerState = {
  mode: PlayerMode;
  selectedIds: string[];
  mainId: string;
  audioId: string;
  pipPositions: Record<string, PipPosition>;
};
