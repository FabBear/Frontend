import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9가-힣_-]+/g, '_').replace(/^_+|_+$/g, '');
}

export function buildReportPdfFilename(processName: string, generatedAt: string) {
  return `report_${sanitizeFilename(processName)}_${sanitizeFilename(generatedAt)}.pdf`;
}

const UNSUPPORTED_COLOR_FN_RE = /\b(?:color|color-mix|lab|lch|oklab|oklch)\(/i;

function isUnsupportedCssColor(value: string): boolean {
  return UNSUPPORTED_COLOR_FN_RE.test(value);
}

function safeColor(value: string, fallback: string): string {
  if (!value || isUnsupportedCssColor(value)) return fallback;
  return value;
}

function safeBackgroundColor(value: string): string {
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || isUnsupportedCssColor(value)) {
    return 'transparent';
  }
  return value;
}

/** html2canvas는 color-mix()/color(srgb ...)/oklch() 같은 최신 CSS 색상 함수를 파싱하지 못한다.
 *  캡처 전에 대상 서브트리의 색상 계열 스타일을 html2canvas가 읽을 수 있는 값으로 고정하고 복원한다. */
function applyPdfSafeStylesInline(root: Element): () => void {
  const els = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))] as HTMLElement[];
  const saved = els.map((el) => el.getAttribute('style'));

  els.forEach((el) => {
    const cs = getComputedStyle(el);
    el.style.color = safeColor(cs.color, '#111827');
    el.style.backgroundColor = safeBackgroundColor(cs.backgroundColor);
    el.style.borderTopColor = safeColor(cs.borderTopColor, '#e5e7eb');
    el.style.borderRightColor = safeColor(cs.borderRightColor, '#e5e7eb');
    el.style.borderBottomColor = safeColor(cs.borderBottomColor, '#e5e7eb');
    el.style.borderLeftColor = safeColor(cs.borderLeftColor, '#e5e7eb');
    el.style.outlineColor = safeColor(cs.outlineColor, '#2563eb');
    el.style.textDecorationColor = safeColor(cs.textDecorationColor, 'currentColor');
    el.style.boxShadow = 'none';

    if (isUnsupportedCssColor(cs.backgroundImage)) {
      el.style.backgroundImage = 'none';
    }
  });

  // 복원 함수 반환
  return () => {
    els.forEach((el, i) => {
      const s = saved[i];
      if (s !== null) {
        el.setAttribute('style', s);
      } else {
        el.removeAttribute('style');
      }
    });
  };
}

function canvasYForElement(el: Element, rootRect: DOMRect, scaleY: number): { top: number; bottom: number } | null {
  const rect = el.getBoundingClientRect();
  if (!rect.height) return null;
  return {
    top: Math.max(0, Math.round((rect.top - rootRect.top) * scaleY)),
    bottom: Math.max(0, Math.round((rect.bottom - rootRect.top) * scaleY)),
  };
}

function isInsideAvoidRange(y: number, ranges: Array<{ top: number; bottom: number }>): boolean {
  return ranges.some((range) => y > range.top + 2 && y < range.bottom - 2);
}

function buildPdfPageSlices(
  element: HTMLElement,
  canvas: HTMLCanvasElement,
  pageCanvasHeight: number
): Array<{ y: number; height: number }> {
  const rootRect = element.getBoundingClientRect();
  const scaleY = canvas.height / Math.max(1, rootRect.height);
  const minSliceHeight = Math.floor(pageCanvasHeight * 0.48);

  const boundarySelector = [
    '[data-pdf-page-boundary]',
    '.final-report__pdf-section',
    '.final-report__pdf-table',
    'thead',
    'tbody',
    'tr',
  ].join(',');
  const avoidSelector = [
    '[data-pdf-avoid-break]',
    'thead',
    'tr',
    '.final-report__pdf-chart',
    '.final-report__pdf-forecast',
    '.final-report__pdf-consensus',
    '.final-report__pdf-action-params',
  ].join(',');

  const boundaries = Array.from(element.querySelectorAll(boundarySelector))
    .flatMap((el) => {
      const y = canvasYForElement(el, rootRect, scaleY);
      return y ? [y.top, y.bottom] : [];
    })
    .filter((y) => y > 0 && y < canvas.height)
    .sort((a, b) => a - b);

  const avoidRanges = Array.from(element.querySelectorAll(avoidSelector))
    .map((el) => canvasYForElement(el, rootRect, scaleY))
    .filter((range): range is { top: number; bottom: number } => !!range)
    .filter((range) => range.bottom - range.top < pageCanvasHeight * 0.9)
    .sort((a, b) => a.top - b.top);

  const slices: Array<{ y: number; height: number }> = [];
  let y = 0;

  while (y < canvas.height - 1) {
    const remaining = canvas.height - y;
    if (remaining <= pageCanvasHeight) {
      slices.push({ y, height: remaining });
      break;
    }

    const ideal = y + pageCanvasHeight;
    const minY = y + minSliceHeight;
    const beforeIdeal = boundaries
      .filter((candidate) => candidate > minY && candidate <= ideal && !isInsideAvoidRange(candidate, avoidRanges))
      .at(-1);

    let nextY = beforeIdeal ?? ideal;
    const crossingRange = avoidRanges.find((range) => nextY > range.top && nextY < range.bottom);
    if (crossingRange && crossingRange.top > minY) {
      nextY = crossingRange.top;
    }

    nextY = Math.max(y + 1, Math.min(nextY, canvas.height));
    slices.push({ y, height: nextY - y });
    y = nextY;
  }

  return slices;
}

function canvasSliceToDataUrl(canvas: HTMLCanvasElement, y: number, height: number): string {
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = canvas.width;
  pageCanvas.height = height;
  const ctx = pageCanvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png', 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  ctx.drawImage(canvas, 0, y, canvas.width, height, 0, 0, canvas.width, height);
  return pageCanvas.toDataURL('image/png', 1);
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  // 1. data-pdf-ignore 요소 임시 숨김
  const ignoreEls = element.querySelectorAll<HTMLElement>('[data-pdf-ignore]');
  ignoreEls.forEach((el) => {
    el.style.visibility = 'hidden';
  });

  // 2. data-pdf-scroll 요소 max-height/overflow 임시 해제
  const scrollEls = element.querySelectorAll<HTMLElement>('[data-pdf-scroll]');
  const savedScrollStyles = new Map<HTMLElement, { maxHeight: string; overflow: string }>();
  scrollEls.forEach((el) => {
    savedScrollStyles.set(el, { maxHeight: el.style.maxHeight, overflow: el.style.overflow });
    el.style.maxHeight = 'none';
    el.style.overflow = 'visible';
  });

  // 3. 캡처 대상의 CSS 색상 함수를 html2canvas 호환 값으로 고정
  const restorePdfSafeStyles = applyPdfSafeStylesInline(element);

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (_doc, clonedRoot) => {
        // ECharts canvas → 클론에 직접 복사
        const origCanvases = element.querySelectorAll<HTMLCanvasElement>('canvas');
        const clonedCanvases = clonedRoot.querySelectorAll<HTMLCanvasElement>('canvas');
        origCanvases.forEach((orig, i) => {
          const clone = clonedCanvases[i];
          if (!clone) return;
          clone.width = orig.width;
          clone.height = orig.height;
          clone.getContext('2d')?.drawImage(orig, 0, 0);
        });
      },
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const pxPerMm = canvas.width / pageW;
    const pageCanvasHeight = Math.floor(pageH * pxPerMm);
    const slices = buildPdfPageSlices(element, canvas, pageCanvasHeight);

    slices.forEach((slice, index) => {
      if (index > 0) pdf.addPage();
      const imgData = canvasSliceToDataUrl(canvas, slice.y, slice.height);
      const sliceH = slice.height / pxPerMm;
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, sliceH);
    });

    pdf.save(filename);
  } finally {
    // 복원
    restorePdfSafeStyles();
    ignoreEls.forEach((el) => {
      el.style.visibility = '';
    });
    scrollEls.forEach((el) => {
      const s = savedScrollStyles.get(el);
      if (s) {
        el.style.maxHeight = s.maxHeight;
        el.style.overflow = s.overflow;
      }
    });
  }
}
