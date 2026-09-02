export function stripVttTags(raw: string): string {
  let text = raw;
  text = text.replace(/<v[^>]*>/gi, (match) => {
    const inner = match.slice(2, -1).trim();
    let name = inner.replace(/^\.[^\s]+/, '').trim();
    if (name.includes('.')) name = name.split('.')[0]!.trim();
    if (!name) return '';
    return `${name}: `;
  });
  text = text.replace(/<\/?[^>]+>/g, '');
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;|&#x27;/gi, "'");
  return text;
}
