import DOMPurify from 'dompurify';
import { marked } from 'marked';

// GFM + 단일 개행을 <br>로(채팅 답변 가독성). 동기 파싱.
marked.setOptions({ gfm: true, breaks: true });

// 외부 링크는 새 탭 + 안전 속성으로.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** LLM 마크다운 답변 → 안전한 HTML(XSS sanitize). v-html 전용. */
export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  const html = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
