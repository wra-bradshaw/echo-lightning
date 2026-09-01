import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { NAVIGATION_EVENT } from '../platform/browser/navigation-store';

export function installHistoryBridge(target: Window = window): void {
  const marker = '__echoLightningHistoryBridgeInstalled';
  const page = target as Window & { [marker]?: boolean };
  if (page[marker]) return;
  page[marker] = true;
  const notify = () => target.document.dispatchEvent(new Event(NAVIGATION_EVENT));
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = target.history[method];
    target.history[method] = function (this: History, ...args: Parameters<History[typeof method]>) {
      const result = original.apply(this, args);
      notify();
      return result;
    } as History[typeof method];
  }
  target.addEventListener('popstate', notify, false);
}

export default defineUnlistedScript(() => {
  installHistoryBridge();
});
