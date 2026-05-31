// ECharts option objects are plain JS and cannot read CSS custom properties (var(--token)).
// These helpers resolve CSS tokens at runtime via a temporary DOM span + getComputedStyle.
// Both '--token' and 'var(--token)' input formats are accepted.

const cssVarCache = new Map<string, string>();
const fontSizeCache = new Map<string, number>();

export function resolveCssVar(token: string): string {
  if (typeof window === 'undefined' || !document.body) return token;
  if (!token.startsWith('--') && !token.startsWith('var(')) return token;

  const cached = cssVarCache.get(token);
  if (cached) return cached;

  const cssValue = token.startsWith('--') ? `var(${token})` : token;
  const el = document.createElement('span');
  el.style.color = cssValue;
  document.body.appendChild(el);
  const color = getComputedStyle(el).color;
  document.body.removeChild(el);

  const resolved = color || token;
  cssVarCache.set(token, resolved);
  return resolved;
}

export function resolveCssFontSize(token: string): number {
  if (typeof window === 'undefined' || !document.body) return 16;
  if (!token.startsWith('--') && !token.startsWith('var(')) {
    const parsed = Number.parseFloat(token);
    return Number.isNaN(parsed) ? 16 : parsed;
  }

  const cached = fontSizeCache.get(token);
  if (cached) return cached;

  const cssValue = token.startsWith('--') ? `var(${token})` : token;
  const el = document.createElement('span');
  el.style.fontSize = cssValue;
  document.body.appendChild(el);
  const size = Number.parseFloat(getComputedStyle(el).fontSize);
  document.body.removeChild(el);

  const resolved = Number.isNaN(size) ? 16 : size;
  fontSizeCache.set(token, resolved);
  return resolved;
}
