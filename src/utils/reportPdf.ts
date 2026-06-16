import html2pdf from 'html2pdf.js';

export function buildReportPdfFilename(processName: string, generatedAt: string) {
  const sanitize = (v: string) => v.replace(/[^a-zA-Z0-9가-힣_-]+/g, '_').replace(/^_+|_+$/g, '');
  return `report_${sanitize(processName)}_${sanitize(generatedAt)}.pdf`;
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

/** html2canvas는 color-mix()/oklch() 같은 최신 CSS 색상 함수를 파싱하지 못한다.
 *  캡처 전에 대상 서브트리의 색상 계열 스타일을 호환 값으로 고정하고 복원한다. */
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

  return () => {
    els.forEach((el, i) => {
      const s = saved[i];
      if (s !== null) el.setAttribute('style', s);
      else el.removeAttribute('style');
    });
  };
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  // 인터랙티브 요소 숨김 (버튼, RAG 바로가기 등)
  element.classList.add('is-pdf-mode');

  // 스크롤 영역 max-height 임시 해제
  const scrollEls = element.querySelectorAll<HTMLElement>('[data-pdf-scroll]');
  const savedScrollStyles = new Map<HTMLElement, { maxHeight: string; overflow: string }>();
  scrollEls.forEach((el) => {
    savedScrollStyles.set(el, { maxHeight: el.style.maxHeight, overflow: el.style.overflow });
    el.style.maxHeight = 'none';
    el.style.overflow = 'visible';
  });

  const restorePdfSafeStyles = applyPdfSafeStylesInline(element);
  const pdfOptions = {
    margin: [12, 12, 12, 12] as [number, number, number, number],
    filename,
    image: { type: 'jpeg' as const, quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (_doc: Document, clonedRoot: HTMLElement) => {
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
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    await html2pdf().set(pdfOptions).from(element).save();
  } finally {
    element.classList.remove('is-pdf-mode');
    restorePdfSafeStyles();
    scrollEls.forEach((el) => {
      const s = savedScrollStyles.get(el);
      if (s) {
        el.style.maxHeight = s.maxHeight;
        el.style.overflow = s.overflow;
      }
    });
  }
}
