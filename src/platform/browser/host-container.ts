/**
 * @deprecated Prefer WXT `createShadowRootUi` in `lightning-runtime.content.ts`.
 * Kept for fallback / legacy tests and manual host creation. The WXT `createShadowRootUi`
 * with `name: "echo-lightning"` now owns the shadow host lifecycle; this helper remains
 * only for non-WXT contexts or as a fallback if the UI needs to be constructed without
 * the content-script context. Fallback backgroundColor uses `hsl(var(--lightning-bg))`.
 */
export function createHostContainer(document: Document): HTMLDivElement {
  const host = document.createElement('div');
  host.id = 'echo-lightning-host';
  host.dataset.echoLightning = 'true';
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    pointerEvents: 'auto',
    backgroundColor: 'hsl(var(--lightning-bg))',
    overflow: 'auto',
  });
  return host;
}
