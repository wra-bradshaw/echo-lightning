export function createHostContainer(document: Document): HTMLDivElement {
  const host = document.createElement('div');
  host.id = 'echo-lightning-host';
  host.dataset.echoLightning = 'true';
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    pointerEvents: 'auto',
    backgroundColor: 'transparent',
    overflow: 'auto',
  });
  return host;
}
