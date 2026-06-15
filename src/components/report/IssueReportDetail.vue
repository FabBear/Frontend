<script setup lang="ts">
import { computed } from 'vue';

import { ArrowLeft, ExternalLink, MessageCircle } from '@lucide/vue';

import type { AgentRunListItem } from '@/services/agentTaskService';

import type { AgentTaskResponse } from '@/types/agentTask';

import BaseButton from '@/components/base/BaseButton.vue';

const props = defineProps<{
  task: AgentTaskResponse | null;
  item: AgentRunListItem | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  back: [];
  openReference: [ref: string];
  askAi: [task: AgentTaskResponse];
}>();

const result = computed(() => props.task?.result ?? null);
const isMonthly = computed(() => props.item?.reportIntent === 'MONTHLY');
const reportTitle = computed(() => {
  if (isMonthly.value) {
    const parts = getKstDateParts(props.item?.periodFrom ?? null);
    return parts ? `${parts.year}년 ${parts.month}월 보고서` : '월간 보고서';
  }
  if (props.item?.periodFrom || props.item?.periodTo) {
    return `${formatReportDate(props.item.periodFrom)} ~ ${formatReportDate(props.item.periodTo)} 기간 이슈 보고서`;
  }
  return result.value?.artifacts?.[0]?.title ?? '기간 이슈 보고서';
});
const reportKicker = computed(() => (isMonthly.value ? 'Monthly Issue Briefing' : 'Period Issue Report'));
const reportPeriodText = computed(
  () => `${formatReportDate(props.item?.periodFrom)} ~ ${formatReportDate(props.item?.periodTo)}`
);
const completedText = computed(() =>
  formatRunDate(props.item?.completedAt ?? props.task?.completedAt ?? props.item?.createdAt)
);
const summaryText = computed(() => result.value?.summary || '요약 데이터가 아직 없습니다.');
const evidence = computed(() => result.value?.evidence ?? []);
const primaryEvidence = computed(() => evidence.value.slice(0, 4));
const remainingEvidence = computed(() => evidence.value.slice(4));
const propagation = computed(() => result.value?.propagation ?? null);
const responseDirections = computed(() => result.value?.responseDirections ?? []);
const references = computed(() => result.value?.references ?? null);
const watchToolGroups = computed(() => result.value?.watchToolGroups ?? []);
const affectedProcessesText = computed(() => joinOrDash(propagation.value?.affectedProcesses));
const affectedToolGroupsText = computed(() => joinOrDash(propagation.value?.affectedToolGroups));
const reportReferenceLinks = computed(() => {
  const caseRefs = uniqueStrings(references.value?.caseIds);
  const reportRefs = uniqueStrings(references.value?.reportIds);
  const tgRefs = uniqueStrings(references.value?.tgIds);
  const refs = caseRefs.length ? caseRefs : tgRefs.slice(0, 5);
  return refs.map((ref, index) => {
    const reportId = reportRefs[index] ?? null;
    const displayRef = displayReference(ref, index);
    return {
      ref,
      title: `${displayRef} 리포트`,
      meta: reportId ? `Report ${shortId(reportId)}` : referenceMeta(ref),
    };
  });
});

function handleAskAi() {
  if (props.task) emit('askAi', props.task);
}

function joinOrDash(values: string[] | undefined | null) {
  const filtered = values?.filter(Boolean) ?? [];
  return filtered.length ? filtered.join(', ') : '-';
}

function uniqueStrings(values: string[] | undefined | null) {
  return [...new Set((values ?? []).map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function displayReference(value: string, index: number) {
  if (isUuid(value)) return `케이스 ${index + 1}`;
  return value;
}

function referenceMeta(value: string) {
  if (isUuid(value)) return `Case ${shortId(value)}`;
  return '케이스 리포트 탭으로 이동';
}

function getKstDateParts(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function formatReportDate(value: string | null | undefined) {
  const parts = getKstDateParts(value);
  if (!parts) return '미지정';
  return `${parts.year}.${String(parts.month).padStart(2, '0')}.${String(parts.day).padStart(2, '0')}`;
}

function formatRunDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace('T', ' ');
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
</script>

<template>
  <article class="issue-report-detail">
    <header class="issue-report-detail__toolbar">
      <div>
        <span>{{ reportKicker }}</span>
        <h2>{{ reportTitle }}</h2>
        <p>{{ reportPeriodText }} · 생성 {{ completedText }}</p>
      </div>
      <div class="issue-report-detail__actions">
        <BaseButton v-if="task?.status === 'SUCCEEDED'" variant="soft" size="sm" @click="handleAskAi">
          <MessageCircle :size="14" />
          AI에게 질문
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="$emit('back')">
          <ArrowLeft :size="14" />
          목록
        </BaseButton>
      </div>
    </header>

    <p v-if="loading" class="issue-report-detail__state">보고서를 불러오는 중입니다.</p>
    <p v-else-if="!task" class="issue-report-detail__state">왼쪽 목록에서 보고서를 선택하세요.</p>
    <p v-else-if="task.status === 'FAILED'" class="issue-report-detail__state issue-report-detail__state--error">
      {{ task.errorMessage ?? '보고서 생성에 실패했습니다.' }}
    </p>
    <p v-else-if="task.status !== 'SUCCEEDED' || !result" class="issue-report-detail__state">
      보고서가 아직 생성 중입니다.
    </p>

    <template v-else>
      <section class="issue-report-detail__summary" aria-label="Summary">
        <span>Summary</span>
        <p>{{ summaryText }}</p>
      </section>

      <section class="issue-report-detail__section">
        <h3><span>1</span> 핵심 지표</h3>
        <dl class="issue-report-detail__metrics">
          <div v-for="metric in primaryEvidence" :key="`${metric.label}-${metric.value}`">
            <dt>{{ metric.label }}</dt>
            <dd>{{ metric.value }}</dd>
            <small>{{ metric.description }}</small>
          </div>
        </dl>
        <table v-if="remainingEvidence.length" class="issue-report-detail__evidence-table">
          <thead>
            <tr>
              <th>근거</th>
              <th>값</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="evidenceRow in remainingEvidence" :key="`${evidenceRow.label}-${evidenceRow.value}`">
              <th>{{ evidenceRow.label }}</th>
              <td>{{ evidenceRow.value }}</td>
              <td>{{ evidenceRow.description }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="issue-report-detail__section">
        <h3><span>2</span> 병목 영향 범위</h3>
        <p>{{ propagation?.summary || '영향 범위 요약 데이터가 아직 없습니다.' }}</p>
        <dl class="issue-report-detail__scope">
          <div>
            <dt>영향 공정</dt>
            <dd>{{ affectedProcessesText }}</dd>
          </div>
          <div>
            <dt>대상 TG</dt>
            <dd>{{ affectedToolGroupsText }}</dd>
          </div>
          <div>
            <dt>관찰 기간</dt>
            <dd>{{ propagation?.horizon || reportPeriodText }}</dd>
          </div>
        </dl>
      </section>

      <section class="issue-report-detail__section">
        <h3><span>3</span> 대응 방향</h3>
        <ol class="issue-report-detail__directions">
          <li v-for="direction in responseDirections" :key="direction.title">
            <strong>{{ direction.title }}</strong>
            <p>{{ direction.description }}</p>
            <small v-if="direction.owner || direction.caution">
              <template v-if="direction.owner">담당 {{ direction.owner }}</template>
              <template v-if="direction.owner && direction.caution"> · </template>
              <template v-if="direction.caution">{{ direction.caution }}</template>
            </small>
          </li>
        </ol>
      </section>

      <section class="issue-report-detail__section">
        <h3><span>4</span> 근거 리포트와 후속 조회</h3>
        <div v-if="reportReferenceLinks.length" class="issue-report-detail__report-links">
          <button
            v-for="link in reportReferenceLinks"
            :key="`${link.ref}-${link.meta}`"
            type="button"
            @click="$emit('openReference', link.ref)"
          >
            <strong>{{ link.title }}</strong>
            <span>{{ link.meta }}</span>
            <ExternalLink :size="14" aria-hidden="true" />
          </button>
        </div>
        <p v-else class="issue-report-detail__empty-note">
          이 기간에 바로 연결할 케이스 리포트가 없습니다. 리포트가 생성되면 이곳에서 한 줄 링크로 열 수 있습니다.
        </p>
        <dl class="issue-report-detail__scope">
          <div>
            <dt>참조 케이스</dt>
            <dd>{{ joinOrDash(references?.caseIds) }}</dd>
          </div>
          <div>
            <dt>참조 TG</dt>
            <dd>{{ joinOrDash(references?.tgIds) }}</dd>
          </div>
        </dl>
        <ul v-if="watchToolGroups.length" class="issue-report-detail__watch-list">
          <li v-for="watch in watchToolGroups" :key="`${watch.tgName}-${watch.reason}`">
            <strong>{{ watch.tgName }}</strong>
            <span>{{ watch.reason }}</span>
          </li>
        </ul>
      </section>
    </template>
  </article>
</template>

<style scoped>
.issue-report-detail {
  display: grid;
  gap: var(--space-5);
}

.issue-report-detail__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-4);
}

.issue-report-detail__toolbar span,
.issue-report-detail__summary span {
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
}

.issue-report-detail__toolbar h2,
.issue-report-detail__toolbar p,
.issue-report-detail__summary p,
.issue-report-detail__section h3,
.issue-report-detail__section p,
.issue-report-detail__state {
  margin: 0;
}

.issue-report-detail__toolbar h2 {
  margin-top: 2px;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  line-height: 1.3;
}

.issue-report-detail__toolbar p,
.issue-report-detail__state {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.issue-report-detail__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

.issue-report-detail__state {
  border: 1px dashed var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  text-align: center;
}

.issue-report-detail__state--error {
  color: var(--color-status-danger);
}

.issue-report-detail__summary {
  display: grid;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-5);
}

.issue-report-detail__summary p {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  line-height: 1.65;
}

.issue-report-detail__section {
  display: grid;
  gap: var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-5);
}

.issue-report-detail__section:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.issue-report-detail__section h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.issue-report-detail__section h3 span {
  display: inline-grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid var(--color-border-default);
  border-radius: 50%;
  color: var(--color-action-primary);
  font-size: var(--font-size-sm);
}

.issue-report-detail__section p,
.issue-report-detail__scope dd,
.issue-report-detail__directions p,
.issue-report-detail__watch-list span,
.issue-report-detail__empty-note {
  color: var(--color-fg);
  font-size: var(--font-size-base);
  line-height: 1.6;
}

.issue-report-detail__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.issue-report-detail__metrics div {
  border-left: 3px solid var(--color-action-primary);
  padding-left: var(--space-3);
}

.issue-report-detail__metrics dt,
.issue-report-detail__scope dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.issue-report-detail__metrics dd,
.issue-report-detail__scope dd {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
}

.issue-report-detail__metrics small,
.issue-report-detail__directions small {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.issue-report-detail__evidence-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.issue-report-detail__evidence-table th,
.issue-report-detail__evidence-table td {
  border-bottom: 1px solid var(--color-border-subtle);
  padding: var(--space-2) var(--space-1);
  text-align: left;
  vertical-align: top;
}

.issue-report-detail__evidence-table th {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
}

.issue-report-detail__evidence-table td {
  color: var(--color-fg);
}

.issue-report-detail__scope {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.issue-report-detail__report-links {
  display: grid;
  gap: var(--space-2);
}

.issue-report-detail__report-links button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-2);
  min-height: 42px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: var(--space-2) var(--space-3);
  text-align: left;
  transition:
    border-color 0.12s,
    background 0.12s,
    transform 0.12s;
}

.issue-report-detail__report-links button:hover {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  transform: translateY(-1px);
}

.issue-report-detail__report-links strong {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.issue-report-detail__report-links span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.issue-report-detail__empty-note {
  border-left: 3px solid var(--color-border-default);
  padding-left: var(--space-3);
}

.issue-report-detail__directions,
.issue-report-detail__watch-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding-left: 1.35rem;
}

.issue-report-detail__directions li::marker {
  color: var(--color-action-primary);
  font-weight: var(--font-weight-bold);
}

.issue-report-detail__directions strong,
.issue-report-detail__watch-list strong {
  color: var(--color-fg-strong);
}

.issue-report-detail__watch-list {
  list-style: none;
  padding-left: 0;
}

.issue-report-detail__watch-list li {
  display: grid;
  gap: 2px;
  border-left: 3px solid var(--color-border-default);
  padding-left: var(--space-3);
}

@media (max-width: 720px) {
  .issue-report-detail__toolbar {
    flex-direction: column;
  }

  .issue-report-detail__actions {
    justify-content: flex-start;
  }

  .issue-report-detail__metrics {
    grid-template-columns: 1fr;
  }

  .issue-report-detail__report-links button {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .issue-report-detail__report-links span {
    grid-column: 1 / -1;
  }
}
</style>
