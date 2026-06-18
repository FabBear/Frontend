import html2pdf from 'html2pdf.js';

import type { ReportV1 } from '@/types/report';

import { formatKoMonthDayTime } from '@/utils/format';

type ReportV1ActionCandidate = ReportV1['actions']['candidates'][number];
type ReportV1KpiImpact = ReportV1ActionCandidate['kpi_impact'][number];

const KPI_LABELS: Record<string, string> = {
  risk_score: '병목 위험 점수',
  q_time_min: 'Q-time',
  wip: 'WIP',
  wait_ratio: 'Wait Ratio',
  utilization_avg: '평균 가동률',
  available_tool_ratio: '가용 Tool 비율',
  max_util: '최대 가동률',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function labelForKpi(key: string): string {
  return KPI_LABELS[key] ?? key.replaceAll('_', ' ');
}

function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function formatMetricValue(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  if (unit === 'ratio') return `${(value * 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`;
  if (unit === 'min') return `${formatNumber(value)}분`;
  if (unit === 'lots') return `${formatNumber(value)} Lot`;
  if (unit === 'score') return formatNumber(value);
  return formatNumber(value);
}

function formatDelta(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatMetricValue(value, unit)}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  return Number.isNaN(new Date(value).getTime()) ? value : formatKoMonthDayTime(value);
}

function approvedCandidate(report: ReportV1): ReportV1ActionCandidate | null {
  const selected = (report.actions.approved_label ?? report.approval?.selected_label ?? '').toLowerCase();
  return (
    report.actions.candidates.find((candidate) => candidate.is_approved) ??
    report.actions.candidates.find((candidate) => candidate.label.toLowerCase() === selected) ??
    null
  );
}

function renderList(items: string[]): string {
  if (items.length === 0) return '<p class="muted">-</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function normalizeSummaryMarkdown(value: string): string {
  return value
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replace(/(#{1,6}\s*\d*\.?\s*요약)\s*>/g, '$1\n> ')
    .replace(/\*\*\s*>\s*\*\*/g, '**\n> **')
    .replace(/\s+>\s+/g, '\n> ')
    .replace(/\s+\|\s*지표\s*\|/g, '\n| 지표 |')
    .replace(/\s+---+\s*/g, '\n---\n');
}

function cleanMarkdownLine(line: string): string {
  return line
    .trim()
    .replace(/^>\s*/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarySentences(value: string): string[] {
  const normalized = normalizeSummaryMarkdown(value);
  const summaryOnly = normalized
    .replace(/^\s*#{1,6}\s*\d*\.?\s*요약\s*/i, '')
    .split(/\n\s*---+\s*\n|\n\s*#{1,6}\s+\d+\.|\n\s*\|\s*지표\s*\|/)[0];

  const seen = new Set<string>();
  return summaryOnly
    .split('\n')
    .map(cleanMarkdownLine)
    .filter((line) => line && !line.startsWith('|') && !/^[|:\-\s]+$/.test(line))
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .slice(0, 4);
}

function renderSummary(summary: string): string {
  const sentences = summarySentences(summary);
  if (sentences.length === 0) return `<p>${escapeHtml(cleanMarkdownLine(summary) || '-')}</p>`;
  return `<ul class="summary-list">${sentences.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
}

function renderKpiTable(report: ReportV1): string {
  const rows = report.bottleneck_kpis
    .slice(0, 8)
    .map(
      (kpi) => `
        <tr>
          <th>${escapeHtml(kpi.label || labelForKpi(kpi.key))}</th>
          <td>${escapeHtml(formatMetricValue(kpi.value, kpi.unit))}</td>
          <td>${escapeHtml(formatDelta(kpi.delta, kpi.unit))}</td>
        </tr>`
    )
    .join('');
  return `<table><thead><tr><th>지표</th><th>현재값</th><th>직전 대비</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderNoActionTable(report: ReportV1): string {
  if (!report.if_no_action.available || report.if_no_action.kpi_changes.length === 0) {
    return '<p class="muted">무대응 예측 데이터가 없습니다.</p>';
  }
  const rows = report.if_no_action.kpi_changes
    .map(
      (item) => `
        <tr>
          <th>${escapeHtml(labelForKpi(item.kpi))}</th>
          <td>${escapeHtml(formatMetricValue(item.now, item.unit))}</td>
          <td>${escapeHtml(formatMetricValue(item.after, item.unit))}</td>
          <td>${escapeHtml(formatDelta(item.delta, item.unit))}</td>
          <td>${escapeHtml(item.reliability_token)}</td>
        </tr>`
    )
    .join('');
  return `<table><thead><tr><th>KPI</th><th>현재</th><th>${report.if_no_action.horizon_min}분 후</th><th>변화</th><th>신뢰도</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderCauseTable(report: ReportV1): string {
  const rows = report.cause.shap_top
    .slice(0, 6)
    .map(
      (item) => `
        <tr>
          <td>${item.rank}</td>
          <th>${escapeHtml(item.feature)}</th>
          <td>${escapeHtml(formatNumber(item.value))}</td>
          <td>${escapeHtml(formatNumber(item.shap))}</td>
          <td>${escapeHtml(formatNumber(item.contribution_pct))}%</td>
        </tr>`
    )
    .join('');
  return `<table><thead><tr><th>순위</th><th>피처</th><th>현재값</th><th>SHAP</th><th>기여도</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderDiffusionTable(report: ReportV1): string {
  const rows = report.diffusion.high_impact_processes
    .map(
      (item) => `
        <tr>
          <th>${escapeHtml(item.toolgroup)}</th>
          <td>${escapeHtml(formatNumber(item.utilization_pct))}%</td>
          <td>${escapeHtml(formatMetricValue(item.wait_ratio, 'ratio'))}</td>
          <td>${escapeHtml(formatMetricValue(item.wip, 'lots'))}</td>
          <td>${escapeHtml(formatNumber(item.impact_score * 100))}</td>
        </tr>`
    )
    .join('');
  if (!rows) return '<p class="muted">고영향 후속 TG가 없습니다.</p>';
  return `<table><thead><tr><th>후속 TG</th><th>가동률</th><th>Wait Ratio</th><th>WIP</th><th>영향 점수</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderActionComparison(report: ReportV1): string {
  const rows = report.actions.candidates
    .map((candidate) => {
      const qTime = findImpact(candidate, 'q_time_min');
      const wip = findImpact(candidate, 'wip');
      return `
        <tr>
          <th>${escapeHtml(candidate.label)}${candidate.is_approved ? ' *' : ''}</th>
          <td>${escapeHtml(candidate.kind)}</td>
          <td>${escapeHtml(candidate.description)}</td>
          <td>${escapeHtml(qTime ? formatDelta(qTime.delta, qTime.unit) : '-')}</td>
          <td>${escapeHtml(wip ? formatDelta(wip.delta, wip.unit) : '-')}</td>
          <td>${escapeHtml(formatNumber(candidate.composite_score * 100))}</td>
        </tr>`;
    })
    .join('');
  return `<table><thead><tr><th>대응안</th><th>종류</th><th>설명</th><th>Q-time 변화</th><th>WIP 변화</th><th>점수</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function findImpact(candidate: ReportV1ActionCandidate, kpi: string): ReportV1KpiImpact | undefined {
  return candidate.kpi_impact.find((item) => item.kpi === kpi);
}

function renderApprovedForecast(candidate: ReportV1ActionCandidate | null): string {
  if (!candidate?.per_tg_forecasts) return '<p class="muted">승인안 TG별 전망 데이터가 없습니다.</p>';
  const rows = Object.entries(candidate.per_tg_forecasts)
    .map(([tg, forecast]) => {
      const qTime = forecast.action?.q_time_min;
      const wip = forecast.action?.wip;
      const wait = forecast.action?.wait_ratio;
      const util = forecast.action?.utilization_avg;
      return `
        <tr>
          <th>${escapeHtml(tg)}</th>
          <td>${escapeHtml(formatMetricValue(forecast.current?.q_time_min, 'min'))} -> ${escapeHtml(formatMetricValue(qTime, 'min'))}</td>
          <td>${escapeHtml(formatMetricValue(forecast.current?.wip, 'lots'))} -> ${escapeHtml(formatMetricValue(wip, 'lots'))}</td>
          <td>${escapeHtml(formatMetricValue(forecast.current?.wait_ratio, 'ratio'))} -> ${escapeHtml(formatMetricValue(wait, 'ratio'))}</td>
          <td>${escapeHtml(formatMetricValue(forecast.current?.utilization_avg, 'ratio'))} -> ${escapeHtml(formatMetricValue(util, 'ratio'))}</td>
        </tr>`;
    })
    .join('');
  return `<table><thead><tr><th>TG</th><th>Q-time</th><th>WIP</th><th>Wait Ratio</th><th>평균 가동률</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderPlaybook(report: ReportV1): string {
  const playbook = report.actions.playbook;
  if (!playbook.available) return '<p class="muted">현장 조치 가이드가 없습니다.</p>';
  const monitoring = playbook.monitoring.map(
    (item) => `${item.check_after_min}분 후 ${item.kpi}: ${item.target}${item.unit ? ` ${item.unit}` : ''}`
  );
  return `
    <div class="grid two">
      <section>
        <h3>즉시 실행</h3>
        ${renderList(playbook.immediate_actions.map((item) => `${item.order}. ${item.text}`))}
      </section>
      <section>
        <h3>모니터링</h3>
        ${renderList(monitoring)}
      </section>
    </div>
    <p class="note"><b>Rollback:</b> ${escapeHtml(playbook.rollback_condition)}</p>`;
}

function renderRag(report: ReportV1): string {
  const comparison = report.rag_evidence?.comparison;
  const hits = report.rag_evidence?.common_hits ?? [];
  const hitRows = hits
    .slice(0, 4)
    .map(
      (hit) => `
        <tr>
          <th>${escapeHtml(hit.report_title ?? hit.case_id)}</th>
          <td>${escapeHtml(hit.tg_code ?? '-')}</td>
          <td>${escapeHtml(formatNumber((hit.score ?? 0) * 100))}</td>
          <td>${escapeHtml(hit.cause_summary ?? '-')}</td>
        </tr>`
    )
    .join('');
  return `
    <p>${escapeHtml(comparison?.rag_summary ?? comparison?.overall_comment ?? '유사 사례 근거를 기준으로 표준안의 안정성을 확인했습니다.')}</p>
    ${
      hitRows
        ? `<table><thead><tr><th>참조 사례</th><th>TG</th><th>유사도</th><th>요약</th></tr></thead><tbody>${hitRows}</tbody></table>`
        : ''
    }`;
}

function buildReportHtml(report: ReportV1, caseId?: string | null): string {
  const approved = approvedCandidate(report);
  const reportTitle = `${report.meta.toolgroup} 병목 대응 보고서`;
  return `
    <article class="pdf-report">
      <header class="cover">
        <p class="eyebrow">FAB 병목 대응 보고서 · Report v1</p>
        <h1>${escapeHtml(reportTitle)}</h1>
        <div class="summary">${renderSummary(report.sections.summary)}</div>
        <dl class="meta">
          <div><dt>문서 종류</dt><dd>AI 병목 대응 리포트</dd></div>
          <div><dt>Case ID</dt><dd>${escapeHtml(caseId ?? '-')}</dd></div>
          <div><dt>대상 TG</dt><dd>${escapeHtml(report.meta.toolgroup)}</dd></div>
          <div><dt>심각도</dt><dd>${escapeHtml(report.meta.severity)}</dd></div>
          <div><dt>탐지 시각</dt><dd>${escapeHtml(report.meta.detected_at)}</dd></div>
          <div><dt>보고서 생성</dt><dd>${escapeHtml(report.meta.generated_at)}</dd></div>
          <div><dt>승인 상태</dt><dd>${escapeHtml(report.approval?.status ?? '-')} · ${escapeHtml(report.approval?.selected_label ?? '-')}</dd></div>
          <div><dt>승인자</dt><dd>${escapeHtml(report.approval?.approver_name ?? '-')} · ${escapeHtml(formatDateTime(report.approval?.approved_at))}</dd></div>
        </dl>
      </header>

      <section class="section">
        <h2>1. 핵심 판단</h2>
        <div class="kpi-strip">
          <div><span>위험 점수</span><b>${escapeHtml(formatNumber(report.risk.score))}</b></div>
          <div><span>Composite</span><b>${escapeHtml(formatMetricValue(report.risk.composite_score, 'ratio'))}</b></div>
          <div><span>ML 확률</span><b>${escapeHtml(formatMetricValue(report.risk.probability, 'ratio'))}</b></div>
          <div><span>신뢰도</span><b>${escapeHtml(report.confidence.level)}</b></div>
        </div>
        ${renderKpiTable(report)}
      </section>

      <section class="section">
        <h2>2. 무대응 전망</h2>
        <p>${report.if_no_action.will_get_worse ? '무대응 시 병목 악화가 예상됩니다.' : '무대응 시 급격한 악화 신호는 제한적입니다.'}</p>
        ${renderNoActionTable(report)}
      </section>

      <section class="section">
        <h2>3. 원인 분석</h2>
        <p><b>${escapeHtml(report.cause.primary.category)}</b> · 대표 피처 ${escapeHtml(report.cause.primary.feature)}</p>
        <p>${escapeHtml(report.cause.primary.reasoning || report.cause.summary)}</p>
        ${renderCauseTable(report)}
        <p class="note">업스트림 의심 TG: ${escapeHtml(report.cause.upstream_suspects.join(', ') || '-')}</p>
      </section>

      <section class="section">
        <h2>4. 확산 영향</h2>
        <p>확산 경로: <b>${escapeHtml(report.diffusion.diffusion_path.join(' -> ') || '-')}</b></p>
        <p>전 라인 정지 예상: ${escapeHtml(formatMetricValue(report.diffusion.line_stop_expected_min, 'min'))}</p>
        ${renderDiffusionTable(report)}
      </section>

      <section class="section">
        <h2>5. 승인 대응안</h2>
        <p><b>${escapeHtml(approved?.label ?? report.actions.approved_label ?? '-')}</b> · ${escapeHtml(approved?.kind ?? '-')}</p>
        <p>${escapeHtml(report.actions.recommendation.primary_reason)}</p>
        ${renderApprovedForecast(approved)}
        ${renderPlaybook(report)}
      </section>

      <section class="section">
        <h2>6. 대응안 비교</h2>
        ${renderActionComparison(report)}
        <h3>선택하지 않은 이유</h3>
        ${renderList(report.actions.recommendation.why_not_others.map((item) => `${item.label}: ${item.reason}`))}
      </section>

      <section class="section">
        <h2>7. 유사 사례 근거</h2>
        ${renderRag(report)}
      </section>
    </article>`;
}

function buildPdfContainer(report: ReportV1, caseId?: string | null): HTMLElement {
  const container = document.createElement('div');
  container.className = 'report-v1-pdf-document';
  container.innerHTML = `
    <style>
      .report-v1-pdf-document {
        width: 720px;
        background: #ffffff;
        color: #111827;
        font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
        font-size: 12px;
        line-height: 1.55;
      }
      .pdf-report { padding: 30px 32px; }
      .cover {
        padding: 20px 0 22px;
        border-bottom: 2px solid #111827;
        break-after: avoid;
      }
      .eyebrow {
        margin: 0 0 8px;
        color: #475467;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { color: #111827; font-size: 26px; line-height: 1.25; }
      h2 { margin-bottom: 10px; color: #111827; font-size: 17px; }
      h3 { margin: 12px 0 6px; color: #1f2937; font-size: 13px; }
      .summary { margin-top: 12px; color: #344054; font-size: 13px; }
      .summary-list {
        margin: 0;
        padding-left: 17px;
      }
      .summary-list li + li { margin-top: 5px; }
      .meta {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin: 18px 0 0;
      }
      .meta div, .kpi-strip div {
        border: 1px solid #d0d5dd;
        border-radius: 6px;
        padding: 8px;
        background: #f9fafb;
      }
      dt, .kpi-strip span {
        color: #667085;
        font-size: 10px;
        font-weight: 700;
      }
      dd {
        margin: 3px 0 0;
        color: #111827;
        font-weight: 700;
      }
      .section {
        padding: 18px 0;
        border-bottom: 1px solid #eaecf0;
        break-inside: avoid;
      }
      .kpi-strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }
      .kpi-strip b {
        display: block;
        margin-top: 3px;
        color: #b42318;
        font-size: 17px;
      }
      table {
        width: 100%;
        margin-top: 10px;
        border-collapse: collapse;
        table-layout: fixed;
        break-inside: auto;
      }
      th, td {
        border: 1px solid #d0d5dd;
        padding: 6px 7px;
        vertical-align: top;
        word-break: keep-all;
        overflow-wrap: anywhere;
      }
      thead th {
        background: #f2f4f7;
        color: #344054;
        font-size: 10px;
        text-align: left;
      }
      tbody th {
        background: #fcfcfd;
        color: #111827;
        text-align: left;
      }
      ul {
        margin: 7px 0 0 16px;
        padding: 0;
      }
      li + li { margin-top: 4px; }
      .grid.two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 10px;
      }
      .note {
        margin-top: 10px;
        border-left: 3px solid #2563eb;
        padding: 7px 9px;
        background: #eff6ff;
        color: #1f2937;
      }
      .muted { color: #667085; }
    </style>
    ${buildReportHtml(report, caseId)}
  `;
  return container;
}

export async function downloadReportV1DocumentPdf(report: ReportV1, filename: string, caseId?: string | null) {
  const container = buildPdfContainer(report, caseId);
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  container.style.position = 'relative';
  container.style.margin = '0 auto';
  container.style.pointerEvents = 'none';
  document.body.prepend(container);
  container.scrollIntoView({ block: 'start' });

  try {
    await document.fonts?.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await html2pdf()
      .set({
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 720,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      })
      .from(container)
      .save();
  } finally {
    container.remove();
    window.scrollTo(scrollX, scrollY);
  }
}
