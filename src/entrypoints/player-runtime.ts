import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { HlsMediaController } from '../player/core/media-controller';
import {
  PLAYER_COMMAND_EVENT,
  PLAYER_RUNTIME_READY_EVENT,
  PLAYER_STATUS_EVENT,
  type PlayerCommand,
} from '../player/core/player-events';

function playerElement(id: string): HTMLVideoElement | undefined {
  const shadow = document.getElementById('echo-lightning-host')?.shadowRoot;
  return Array.from(shadow?.querySelectorAll('video') ?? []).find((video) => video.dataset.echoLightningVideo === id);
}

function status(id: string, value: 'ready' | 'error') {
  document.dispatchEvent(new CustomEvent(PLAYER_STATUS_EVENT, { detail: JSON.stringify({ id, status: value }) }));
}

export default defineUnlistedScript(() => {
  const controllers = new Map<string, HlsMediaController>();
  document.addEventListener(PLAYER_COMMAND_EVENT, (event) => {
    const command: PlayerCommand = JSON.parse(String((event as CustomEvent).detail));
    if (command.action === 'destroy') {
      controllers.get(command.id)?.destroy();
      controllers.delete(command.id);
      return;
    }
    if (!command.source) return;
    const media = playerElement(command.id);
    if (!media) {
      status(command.id, 'error');
      return;
    }
    controllers.get(command.id)?.destroy();
    const controller = new HlsMediaController(() => status(command.id, 'error'));
    controllers.set(command.id, controller);
    try {
      controller.attach(media);
      controller.load(command.source);
      status(command.id, 'ready');
    } catch (error) {
      console.warn('Unable to initialize player.', error);
      status(command.id, 'error');
    }
  });
  document.documentElement.dataset.echoLightningPlayerReady = 'true';
  document.dispatchEvent(new Event(PLAYER_RUNTIME_READY_EVENT));
});
