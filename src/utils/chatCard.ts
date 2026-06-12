import type { ChatUiCard } from '@/types/chatbot';

interface Column {
  key: string;
  label: string;
  unit?: string;
}

const LOT_DEFAULT_COLUMNS: Column[] = [
  { key: 'wip', label: 'WIP' },
  { key: 'wait', label: '대기' },
  { key: 'qtime', label: 'Q-time', unit: '분' },
  { key: 'util', label: '가동률', unit: '%' },
];

function mdTable(headers: string[], rows: Array<Array<string | number>>): string {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

/** 챗봇 UI 카드(status/trend/lot/cases)를 사람이 읽고 붙여넣기 좋은 마크다운으로 변환.
 * 복사 시 본문 텍스트와 함께 카드 표 내용까지 클립보드에 담기 위해 사용한다. */
export function cardToMarkdown(card: ChatUiCard | null | undefined): string {
  if (!card) return '';
  const p = card.props as Record<string, unknown>;
  const title = typeof p.title === 'string' && p.title ? `**${p.title}**` : '';
  const blocks: string[] = [];
  if (title) blocks.push(title);

  if (card.type === 'status') {
    const o = p.overall as Record<string, number> | null | undefined;
    if (o) {
      blocks.push(
        `- 가동률 ${o.util}% · WIP ${o.wip} Lot · 가용률 ${o.avail}% · ` +
          `설비 가동 ${o.run}/대기 ${o.idle}/셋업 ${o.setup}/비가동 ${o.down}`
      );
    }
    const areas = (p.areas as Array<Record<string, unknown>>) ?? [];
    if (areas.length) {
      blocks.push(
        mdTable(
          ['구역', 'WIP', '가동률', '가용률'],
          areas.map((a) => [String(a.name), Number(a.wip), `${a.util}%`, `${a.avail}%`])
        )
      );
    }
  } else if (card.type === 'trend') {
    const labels = (p.labels as string[]) ?? [];
    const series = (p.series as Array<{ name: string; data: number[] }>) ?? [];
    blocks.push(
      mdTable(
        ['시각', ...series.map((s) => s.name)],
        labels.map((lb, i) => [lb, ...series.map((s) => s.data[i] ?? '')])
      )
    );
  } else if (card.type === 'lot') {
    const columns = (p.columns as Column[])?.length ? (p.columns as Column[]) : LOT_DEFAULT_COLUMNS;
    const labelHeader = (p.labelHeader as string) || '구역/TG';
    const rows = (p.rows as Array<Record<string, unknown>>) ?? [];
    blocks.push(
      mdTable(
        [labelHeader, ...columns.map((c) => c.label)],
        rows.map((r) => [String(r.label), ...columns.map((c) => `${r[c.key] ?? ''}${c.unit ?? ''}`)])
      )
    );
  } else if (card.type === 'cases') {
    const rows = (p.rows as Array<Record<string, unknown>>) ?? [];
    blocks.push(
      mdTable(
        ['시각', '위치', '위험', '확률', '상태'],
        rows.map((r) => [String(r.when), String(r.where), String(r.grade), `${r.prob}%`, String(r.status)])
      )
    );
  } else if (card.type === 'navigation') {
    if (p.reason) blocks.push(`> ${p.reason}`);
    if (p.label && p.route) blocks.push(`→ ${p.label} (${p.route})`);
  }

  return blocks.join('\n\n');
}
