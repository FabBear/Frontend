/**
 * FinalBottleneckReport의 full_markdown에서 표 데이터를 파싱하고
 * 트렌드 SVG path를 만드는 순수 유틸. (FinalBottleneckReportView.vue에서 분리)
 */

export interface TrendRow {
  label: string;
  qTimeMin: number | null;
  waitRatio: number | null;
  wip: number | null;
  maxUtil: number | null;
}

export interface ModelFeatureRow {
  feature: string;
  currentValue: string;
  contribution: string;
  direction: string;
}

export function parseMarkdownRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function parseNumberCell(cell: string): number | null {
  if (!cell || cell === '-' || cell === 'null') return null;
  const n = Number(cell.replace(/[,%분개건]/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

export function parseTrendRows(markdown: string): TrendRow[] {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /feature\s*트렌드|피처\s*트렌드/i.test(line));
  if (headingIndex === -1) return [];

  const tableStart = lines.findIndex(
    (line, index) => index > headingIndex && line.trim().startsWith('|') && /q_time_min|wait_ratio|wip/i.test(line)
  );
  if (tableStart === -1 || tableStart + 2 >= lines.length) return [];

  const headers = parseMarkdownRow(lines[tableStart]).map((header) => header.toLowerCase());
  const rows: TrendRow[] = [];
  for (let i = tableStart + 2; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    const cells = parseMarkdownRow(line);
    if (cells.length < headers.length) continue;
    const value = (key: string) => parseNumberCell(cells[headers.indexOf(key)] ?? '');
    rows.push({
      label: cells[0],
      qTimeMin: value('q_time_min'),
      waitRatio: value('wait_ratio'),
      wip: value('wip'),
      maxUtil: value('max_util'),
    });
  }

  return rows;
}

export function parseModelFeatureRows(markdown: string): ModelFeatureRow[] {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /SHAP\s*분석|모델\s*SHAP|ML\s*모델/i.test(line));
  if (headingIndex === -1) return [];

  const tableStart = lines.findIndex(
    (line, index) => index > headingIndex && line.trim().startsWith('|') && /피처명|feature/i.test(line)
  );
  if (tableStart === -1 || tableStart + 2 >= lines.length) return [];

  const rows: ModelFeatureRow[] = [];
  for (let i = tableStart + 2; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    const cells = parseMarkdownRow(line);
    if (cells.length < 4) continue;
    rows.push({
      feature: cells[0],
      currentValue: cells[1],
      contribution: cells[2],
      direction: cells[3],
    });
  }

  return rows;
}

export function buildTrendPath(
  values: Array<number | null>,
  xAt: (index: number) => number,
  yAt: (value: number, max: number) => number
): string {
  const numericValues = values.filter((value): value is number => value !== null);
  const max = Math.max(...numericValues, 1);
  return values
    .map((value, index) => {
      if (value === null) return '';
      const command = index === values.findIndex((v) => v !== null) ? 'M' : 'L';
      return `${command} ${xAt(index).toFixed(1)} ${yAt(value, max).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');
}
