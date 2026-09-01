import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { isEchoAuthUrl } from '../integrations/echo/routing/routes';
import { isEchoHost } from '../integrations/echo/routing/url';
import type { ExtensionResponse } from '../platform/extension/messages';

type Runtime = { sendMessage: (message: unknown) => Promise<ExtensionResponse> };

export default defineContentScript({
  matches: ['*://*.echo360.net.au/*'],
  runAt: 'document_start',
  async main() {
    if (!isEchoHost(location.hostname)) return;
    const runtime = browser.runtime as unknown as Runtime;
    try {
      await runtime.sendMessage({ type: 'bootstrap', url: location.href });
      if (isEchoAuthUrl(location.href)) return;
    } catch {
      return;
    }
  },
});
