import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { isEchoAuthUrl } from '../integrations/echo/routing/routes';
import { isEchoHost } from '../integrations/echo/routing/url';
import { isLoggedOutFromDOM } from '../platform/browser/auth-detector';
import type { ExtensionResponse } from '../platform/extension/messages';

type Runtime = { sendMessage: (message: unknown) => Promise<ExtensionResponse> };

export default defineContentScript({
  matches: ['*://*.echo360.net.au/*'],
  runAt: 'document_start',
  async main() {
    if (!isEchoHost(location.hostname)) return;
    if (isEchoAuthUrl(location.href)) return;
    const runtime = browser.runtime as unknown as Runtime;
    let globallyDisabled = false;
    try {
      const stored = await browser.storage.local.get('lightning.globalEnabled');
      globallyDisabled = stored['lightning.globalEnabled'] === false;
    } catch {
      void 0;
    }
    let isLoggedOut = false;
    try {
      isLoggedOut = isLoggedOutFromDOM(document);
    } catch {
      void 0;
    }
    try {
      if (!globallyDisabled && isLoggedOut) {
        await runtime.sendMessage({ type: 'reportLoggedOut', url: location.href });
        return;
      }
      await runtime.sendMessage({ type: 'bootstrap', url: location.href, isLoggedOut });
    } catch (error) {
      console.warn('Unable to bootstrap Echo360 Lightning.', error);
    }
  },
});
