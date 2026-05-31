// ECharts option objects are plain JS and cannot read CSS custom properties (var(--token)).
// These helpers resolve CSS tokens at runtime via a temporary DOM span + getComputedStyle.
// Both '--token' and 'var(--token)' input formats are accepted.

export function resolveCssVar(token: string): string {
  if (typeof window === 'undefined' || !document.body) return token;
  const cssValue = token.startsWith('--') ? `var(${token})` : token;
  const el = document.createElement('span');
  el.style.color = cssValue;
  document.body.appendChild(el);
  const color = getComputedStyle(el).color;
  document.body.removeChild(el);
  return color || token;
}

export function resolveCssFontSize(token: string): number {
  if (typeof window === 'undefined' || !document.body) return 16;
  const cssValue = token.startsWith('--') ? `var(${token})` : token;
  const el = document.createElement('span');
  el.style.fontSize = cssValue;
  document.body.appendChild(el);
  const size = Number.parseFloat(getComputedStyle(el).fontSize);
  document.body.removeChild(el);
  return Number.isNaN(size) ? 16 : size;
}
