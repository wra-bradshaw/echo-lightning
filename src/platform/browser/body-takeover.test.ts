import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installBodyTakeover } from './body-takeover';

function setupDoc(bodyHtml: string, headHtml = ''): Document {
  document.head.innerHTML = headHtml;
  document.body.innerHTML = bodyHtml;
  return document;
}

async function flushObservers(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('installBodyTakeover', () => {
  it('leaves only the lightning host in the body', () => {
    setupDoc('<div id="echo-app-root">courses</div><div id="echo-lightning-host"></div>');
    const takeover = installBodyTakeover(document);
    expect(document.body.children).toHaveLength(1);
    expect(document.getElementById('echo-lightning-host')).not.toBeNull();
    expect(document.getElementById('echo-app-root')).toBeNull();
    takeover.dispose();
  });

  it('neuters background media before removing it', () => {
    setupDoc(
      '<div id="echo-app-root"><video id="stock" src="https://content.example.test/stock.m3u8"></video></div><div id="echo-lightning-host"></div>',
    );
    const stock = document.getElementById('stock') as HTMLVideoElement;
    const pause = vi.fn();
    Object.defineProperty(stock, 'pause', { configurable: true, value: pause });
    const load = vi.fn();
    Object.defineProperty(stock, 'load', { configurable: true, value: load });
    const takeover = installBodyTakeover(document);
    expect(document.getElementById('stock')).toBeNull();
    expect(pause).toHaveBeenCalled();
    takeover.dispose();
    expect(load).toHaveBeenCalled();
  });

  it('removes echo nodes added after install', async () => {
    setupDoc('<div id="echo-lightning-host"></div>');
    const takeover = installBodyTakeover(document);
    const late = document.createElement('div');
    late.id = 'echo-late-root';
    document.body.append(late);
    await flushObservers();
    expect(document.getElementById('echo-late-root')).toBeNull();
    expect(document.getElementById('echo-lightning-host')).not.toBeNull();
    takeover.dispose();
  });

  it('re-enforces the invariant when the body element is replaced', async () => {
    setupDoc('<div id="echo-lightning-host"></div><div id="echo-app-root"></div>');
    const takeover = installBodyTakeover(document);
    expect(document.getElementById('echo-app-root')).toBeNull();
    const replacement = document.createElement('body');
    replacement.innerHTML = '<div id="echo-spa-refetch">classroom</div>';
    document.documentElement.replaceChild(replacement, document.body);
    await flushObservers();
    expect(document.body.querySelector('#echo-spa-refetch')).toBeNull();
    takeover.dispose();
  });

  it('strips echo bundles from head while keeping lightning bridges', () => {
    setupDoc(
      '<div id="echo-lightning-host"></div>',
      [
        '<meta charset="utf-8">',
        '<script src="https://echo360.net.au/static/js/classroom.abc123.js"></script>',
        '<link rel="preload" href="https://echo360.net.au/static/js/echoplayer.def456.js" as="script">',
        '<script src="chrome-extension://test-id/history-bridge.js"></script>',
        '<style id="lightning-takeover">html{background:#000}</style>',
      ].join(''),
    );
    const takeover = installBodyTakeover(document, { stripHead: true });
    expect(document.head.querySelector('script[src*="static/js"]')).toBeNull();
    expect(document.head.querySelector('link[href*="static/js"]')).toBeNull();
    expect(document.head.querySelector('script[src*="history-bridge.js"]')).not.toBeNull();
    expect(document.head.querySelector('#lightning-takeover')).not.toBeNull();
    expect(document.head.querySelector('meta[charset]')).not.toBeNull();
    takeover.dispose();
  });

  it('stops enforcing after dispose', async () => {
    setupDoc('<div id="echo-lightning-host"></div>');
    const takeover = installBodyTakeover(document);
    takeover.dispose();
    const late = document.createElement('div');
    late.id = 'echo-after-dispose';
    document.body.append(late);
    await flushObservers();
    expect(document.getElementById('echo-after-dispose')).not.toBeNull();
  });
});
