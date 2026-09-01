import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { injectScript } from 'wxt/utils/inject-script';
import styles from '../app/styles.css?inline';
import { createLightningRuntime } from '../app/runtime';
import { createBrowserStorageAdapter } from '../features/settings';
import { isEchoHost } from '../integrations/echo';
import type { ExtensionResponse } from '../platform/extension/messages';

type Runtime = { sendMessage: (message: unknown) => Promise<ExtensionResponse> };

export default defineContentScript({
  matches: ['*://*.echo360.net.au/*'],
  registration: 'runtime',
  runAt: 'document_start',
  async main() {
    if (!isEchoHost(location.hostname) || document.getElementById('echo-lightning-host')) return;
    const runtimeApi = browser.runtime as unknown as Runtime;
    const host = document.createElement('div');
    host.id = 'echo-lightning-host';
    host.dataset.echoLightning = 'true';
    Object.assign(host.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      pointerEvents: 'auto',
      backgroundColor: 'white',
    });
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    shadow.append(style);
    const app = document.createElement('div');
    app.id = 'lightning-app';
    app.className = 'light';
    shadow.append(app);
    (document.documentElement || document.body).append(host);
    const lightning = createLightningRuntime({
      window,
      sendMessage: (message) => runtimeApi.sendMessage(message),
      settingsStorage: createBrowserStorageAdapter(browser.storage.local),
      cleanup: () => host.remove(),
    });
    lightning.mount(app);
    void injectScript('/history-bridge.js').catch(() => undefined);
    window.addEventListener(
      'pagehide',
      () => {
        lightning.dispose();
      },
      { once: true },
    );
  },
});
