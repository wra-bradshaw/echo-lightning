import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { injectScript } from 'wxt/utils/inject-script';
import styles from '../app/styles.css?inline';
import { createLightningRuntime } from '../app/runtime';
import { createBrowserStorageAdapter } from '../features/settings';
import { isEchoHost } from '../integrations/echo';
import { createPageFetch } from '../integrations/echo/transport/page-fetch';
import type { ExtensionResponse } from '../platform/extension/messages';
import { createHostContainer } from '../platform/browser/host-container';

type Runtime = { sendMessage: (message: unknown) => Promise<ExtensionResponse> };

export default defineContentScript({
  matches: ['*://*.echo360.net.au/*'],
  registration: 'runtime',
  runAt: 'document_start',
  async main() {
    if (!isEchoHost(location.hostname) || document.getElementById('echo-lightning-host')) return;
    const runtimeApi = browser.runtime as unknown as Runtime;
    const host = createHostContainer(document);
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    shadow.append(style);
    const app = document.createElement('div');
    app.id = 'lightning-app';
    shadow.append(app);
    (document.documentElement || document.body).append(host);
    await injectScript('/history-bridge.js').catch((error) => console.warn('Unable to install history bridge.', error));
    await injectScript('/api-bridge.js').catch((error) => console.warn('Unable to install API bridge.', error));
    const lightning = createLightningRuntime({
      window,
      sendMessage: (message) => runtimeApi.sendMessage(message),
      fetcher: createPageFetch(window),
      settingsStorage: createBrowserStorageAdapter(browser.storage.local),
      cleanup: () => host.remove(),
    });
    lightning.mount(app);
    window.addEventListener(
      'pagehide',
      () => {
        lightning.dispose();
      },
      { once: true },
    );
  },
});
