export function injectTakeoverStyle(doc: Document): HTMLStyleElement {
  const style = doc.createElement('style');
  style.id = 'lightning-takeover';
  style.textContent =
    ':root{--background:0 0% 98%;--foreground:0 0% 9%;--card:0 0% 100%;--card-foreground:0 0% 9%;--popover:0 0% 100%;--popover-foreground:0 0% 9%;--primary:0 0% 9%;--primary-foreground:0 0% 100%;--secondary:0 0% 94%;--secondary-foreground:0 0% 9%;--muted:0 0% 94%;--muted-foreground:0 0% 38%;--accent:0 0% 94%;--accent-foreground:0 0% 9%;--destructive:0 72% 51%;--destructive-foreground:0 0% 100%;--border:0 0% 55%;--input:0 0% 55%;--ring:0 0% 9%}html.dark,:root.dark,html[data-theme="dark"]{--background:0 0% 7%;--foreground:0 0% 98%;--card:0 0% 11%;--card-foreground:0 0% 98%;--popover:0 0% 11%;--popover-foreground:0 0% 98%;--primary:0 0% 98%;--primary-foreground:0 0% 9%;--secondary:0 0% 18%;--secondary-foreground:0 0% 98%;--muted:0 0% 18%;--muted-foreground:0 0% 72%;--accent:0 0% 18%;--accent-foreground:0 0% 98%;--destructive:0 62% 38%;--destructive-foreground:0 0% 98%;--border:0 0% 38%;--input:0 0% 38%;--ring:0 0% 82%}html,body{background:hsl(var(--background))!important;color:hsl(var(--foreground))!important}';
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
