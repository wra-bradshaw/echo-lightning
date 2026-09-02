export function injectTakeoverStyle(doc: Document): HTMLStyleElement {
  const style = doc.createElement('style');
  style.id = 'lightning-takeover';
  style.textContent =
    ':root{--background:0 0% 98%;--foreground:0 0% 9%}html.dark,:root.dark,html[data-theme="dark"]{--background:0 0% 7%;--foreground:0 0% 98%}html,body{background:hsl(var(--background))!important;color:hsl(var(--foreground))!important}';
  (doc.head ?? doc.documentElement).appendChild(style);
  return style;
}

export function removeTakeoverStyle(style: HTMLStyleElement): void {
  style.remove();
}

export function syncOuterTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.style.colorScheme = isDark ? 'dark' : 'light';
}
