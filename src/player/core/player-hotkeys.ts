export const PLAYER_PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type PlayerHotkeyState = {
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
};

export type PlayerHotkeyAction =
  | { type: 'seek'; seconds: number }
  | { type: 'seek-to'; seconds: number }
  | { type: 'set-playback-rate'; rate: number }
  | { type: 'set-volume'; volume: number }
  | { type: 'step-frame'; seconds: number }
  | { type: 'toggle-captions' }
  | { type: 'toggle-fullscreen' }
  | { type: 'toggle-mute' }
  | { type: 'toggle-picture-in-picture' }
  | { type: 'toggle-playback' };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeKey(key: string): string {
  if (key === ' ') return 'Space';
  return key.length === 1 ? key.toLowerCase() : key;
}

export function getPlayerHotkeyAction(key: string, state: PlayerHotkeyState): PlayerHotkeyAction | null {
  const normalizedKey = normalizeKey(key);

  if (normalizedKey === 'Space' || normalizedKey === 'k') return { type: 'toggle-playback' };
  if (normalizedKey === 'm') return { type: 'toggle-mute' };
  if (normalizedKey === 'f') return { type: 'toggle-fullscreen' };
  if (normalizedKey === 'c') return { type: 'toggle-captions' };
  if (normalizedKey === 'i') return { type: 'toggle-picture-in-picture' };
  if (normalizedKey === 'ArrowLeft') return { type: 'seek', seconds: -5 };
  if (normalizedKey === 'ArrowRight') return { type: 'seek', seconds: 5 };
  if (normalizedKey === 'j') return { type: 'seek', seconds: -10 };
  if (normalizedKey === 'l') return { type: 'seek', seconds: 10 };
  if (normalizedKey === 'Home') return { type: 'seek-to', seconds: 0 };
  if (normalizedKey === 'End') return { type: 'seek-to', seconds: state.duration };
  if (normalizedKey === 'ArrowUp') {
    const volume = clamp(state.volume + 0.05, 0, 1);
    return volume === state.volume ? null : { type: 'set-volume', volume };
  }
  if (normalizedKey === 'ArrowDown') {
    const volume = clamp(state.volume - 0.05, 0, 1);
    return volume === state.volume ? null : { type: 'set-volume', volume };
  }
  if (/^[0-9]$/.test(normalizedKey)) {
    return { type: 'seek-to', seconds: (state.duration * Number(normalizedKey)) / 10 };
  }
  if (normalizedKey === ',') {
    return state.isPlaying ? null : { type: 'step-frame', seconds: -1 / 30 };
  }
  if (normalizedKey === '.') {
    return state.isPlaying ? null : { type: 'step-frame', seconds: 1 / 30 };
  }
  if (normalizedKey === '>' || normalizedKey === '<') {
    const currentRateIndex = PLAYER_PLAYBACK_RATES.indexOf(
      state.playbackRate as (typeof PLAYER_PLAYBACK_RATES)[number],
    );
    if (currentRateIndex < 0) return null;
    const nextRateIndex = normalizedKey === '>' ? currentRateIndex + 1 : currentRateIndex - 1;
    const rate = PLAYER_PLAYBACK_RATES[nextRateIndex];
    return rate === undefined ? null : { type: 'set-playback-rate', rate };
  }
  return null;
}
