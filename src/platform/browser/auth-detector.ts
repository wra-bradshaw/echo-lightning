export const LOGGED_OUT_SELECTORS = [
  '#email',
  '#submitBtn',
  'input[autocomplete="username"]',
  'input[name="credentials.passcode"]',
  'a[data-se="button"]',
  'form[action*="login"]',
  'a[href*="login.echo360.net.au"]',
  '#login-app',
] as const;

export function isLoggedOutFromDOM(doc: Document): boolean {
  if (!doc) return false;
  for (const selector of LOGGED_OUT_SELECTORS) {
    try {
      if (doc.querySelector(selector)) return true;
    } catch {
      void 0;
    }
  }
  const meta = doc.querySelector('meta[http-equiv="refresh"]');
  if (meta) {
    const content = meta.getAttribute('content') ?? '';
    if (content.toLowerCase().includes('login.echo360')) return true;
  }
  if (doc.body?.classList.contains('login')) return true;
  if (doc.getElementById('login-app')) return true;
  const forms = doc.querySelectorAll('form');
  for (const form of forms) {
    const action = form.getAttribute('action') ?? '';
    if (action.toLowerCase().includes('login')) return true;
  }
  const links = doc.querySelectorAll('a[href]');
  for (const link of links) {
    const href = link.getAttribute('href') ?? '';
    if (href.toLowerCase().includes('login.echo360.net.au')) return true;
  }
  return false;
}
