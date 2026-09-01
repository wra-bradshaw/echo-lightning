export const PLAYER_COMMAND_EVENT = 'echo-lightning:player-command';
export const PLAYER_STATUS_EVENT = 'echo-lightning:player-status';
export const PLAYER_RUNTIME_READY_EVENT = 'echo-lightning:player-runtime-ready';

export type PlayerCommand = {
  action: 'load' | 'destroy';
  id: string;
  source?: { src: string; type?: string };
};

export type PlayerStatus = {
  id: string;
  status: 'ready' | 'error';
};
