export const LIGHTNING_HOST_ID = 'echo-lightning-host';

export type BodyTakeoverOptions = {
  stripHead?: boolean;
};

export type BodyTakeoverHandle = {
  dispose(): void;
};

function getMutationObserver(doc: Document): typeof MutationObserver | undefined {
  const viewObserver = doc.defaultView?.MutationObserver;
  if (typeof viewObserver === 'function') return viewObserver;
  const globalObserver = (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver;
  return typeof globalObserver === 'function' ? globalObserver : undefined;
}

function neuterMediaElement(media: HTMLMediaElement): void {
  try {
    media.pause();
  } catch {
    void 0;
  }
  try {
    media.removeAttribute('src');
  } catch {
    void 0;
  }
  try {
    media.querySelectorAll('source').forEach((source) => source.remove());
  } catch {
    void 0;
  }
  try {
    media.removeAttribute('srcObject' as string);
  } catch {
    void 0;
  }
  try {
    const record = media as unknown as Record<string, unknown>;
    if (record['srcObject'] !== undefined) record['srcObject'] = null;
  } catch {
    void 0;
  }
  try {
    media.load();
  } catch {
    void 0;
  }
}

function neuterOutsideHost(node: Node): void {
  if (node instanceof HTMLMediaElement) neuterMediaElement(node);
  if (node instanceof Element) {
    if (node.shadowRoot) {
      for (const media of Array.from(node.shadowRoot.querySelectorAll('video,audio'))) {
        neuterMediaElement(media as HTMLMediaElement);
      }
    }
    for (const media of Array.from(node.querySelectorAll('video,audio'))) {
      neuterMediaElement(media as HTMLMediaElement);
    }
    for (const frame of Array.from(node.querySelectorAll('iframe'))) {
      try {
        frame.removeAttribute('src');
      } catch {
        void 0;
      }
      try {
        frame.remove();
      } catch {
        void 0;
      }
    }
    if (node instanceof HTMLIFrameElement) {
      try {
        node.removeAttribute('src');
      } catch {
        void 0;
      }
    }
  }
}

export function pruneBody(doc: Document): void {
  const body = doc.body;
  if (!body) return;
  for (const child of Array.from(body.childNodes)) {
    if (child instanceof Element && child.id === LIGHTNING_HOST_ID) continue;
    try {
      neuterOutsideHost(child);
    } catch {
      void 0;
    }
    try {
      body.removeChild(child);
    } catch {
      try {
        (child as ChildNode).remove();
      } catch {
        void 0;
      }
    }
  }
}

function isHeadBridgeUrl(value: string): boolean {
  return (
    value.includes('history-bridge') ||
    value.includes('api-bridge') ||
    value.includes('player-runtime') ||
    value.startsWith('chrome-extension://') ||
    value.startsWith('moz-extension://') ||
    value.startsWith('safari-extension://')
  );
}

function shouldKeepHeadChild(element: Element): boolean {
  if (element.hasAttribute('data-echo-lightning-keep')) return true;
  if (element.id === 'lightning-takeover' || element.id === 'echo-lightning-takeover') return true;
  const tag = element.tagName.toLowerCase();
  if (tag === 'script') {
    const src = element.getAttribute('src') ?? '';
    if (src && isHeadBridgeUrl(src)) return true;
    return false;
  }
  if (tag === 'link') {
    const href = element.getAttribute('href') ?? '';
    if (href && isHeadBridgeUrl(href)) return true;
    return false;
  }
  return true;
}

export function pruneHead(doc: Document): void {
  const head = doc.head;
  if (!head) return;
  for (const child of Array.from(head.children)) {
    if (shouldKeepHeadChild(child)) continue;
    try {
      child.remove();
    } catch {
      void 0;
    }
  }
}

export function installBodyTakeover(doc: Document, options?: BodyTakeoverOptions): BodyTakeoverHandle {
  const stripHead = options?.stripHead === true;
  const Observer = getMutationObserver(doc);
  let disposed = false;
  let pruning = false;
  let observedBody: HTMLElement | null = doc.body ?? null;
  let bodyObserver: MutationObserver | undefined;
  let headObserver: MutationObserver | undefined;
  let documentObserver: MutationObserver | undefined;

  const pruneAll = () => {
    if (disposed || pruning) return;
    pruning = true;
    try {
      pruneBody(doc);
      if (stripHead) pruneHead(doc);
    } finally {
      pruning = false;
    }
  };

  const observeBody = (body: HTMLElement | null) => {
    observedBody = body;
    if (!body || !Observer || disposed) return;
    if (bodyObserver) bodyObserver.disconnect();
    bodyObserver = new Observer(() => pruneAll());
    bodyObserver.observe(body, { childList: true });
  };

  pruneAll();
  observeBody(doc.body ?? null);

  if (Observer && !disposed) {
    const root = doc.documentElement;
    if (root) {
      documentObserver = new Observer(() => {
        if (disposed) return;
        const currentBody = doc.body ?? null;
        if (currentBody !== observedBody) observeBody(currentBody);
        pruneAll();
      });
      documentObserver.observe(root, { childList: true });
    }
    if (stripHead && doc.head) {
      headObserver = new Observer(() => pruneAll());
      headObserver.observe(doc.head, { childList: true });
    }
  }

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      try {
        bodyObserver?.disconnect();
      } catch {
        void 0;
      }
      try {
        headObserver?.disconnect();
      } catch {
        void 0;
      }
      try {
        documentObserver?.disconnect();
      } catch {
        void 0;
      }
      bodyObserver = undefined;
      headObserver = undefined;
      documentObserver = undefined;
    },
  };
}
