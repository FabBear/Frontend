<script setup lang="ts">
import { ref } from 'vue';

import { FileJson, FileText, MessageCircle, Printer } from '@lucide/vue';

import { downloadBncReportPdf } from '@/services/bncService';

import type { BncReportPayload } from '@/types/bnc';

import BaseButton from '@/components/base/BaseButton.vue';
import FabBearProgressLoader from '@/components/base/FabBearProgressLoader.vue';
import FinalBottleneckReportView from '@/components/report/FinalBottleneckReportView.vue';

import { formatKoMonthDayTime } from '@/utils/format';

defineProps<{
  report: BncReportPayload | null;
  loading?: boolean;
  errorMessage?: string | null;
  aiBusy?: boolean;
}>();

defineEmits<{
  askAi: [];
}>();

type FinalReportInstance = InstanceType<typeof FinalBottleneckReportView>;

const finalReportRef = ref<FinalReportInstance | null>(null);
const isDownloading = ref(false);

async function handlePdfDownload() {
  if (!finalReportRef.value || isDownloading.value) return;
  isDownloading.value = true;
  try {
    await finalReportRef.value.triggerPdfDownload();
  } finally {
    isDownloading.value = false;
  }
}

async function handleBackendPdfDownload(caseId: string) {
  if (isDownloading.value) return;
  isDownloading.value = true;
  try {
    await downloadBncReportPdf(caseId);
  } finally {
    isDownloading.value = false;
  }
}

function handleMarkdownDownload() {
  finalReportRef.value?.downloadMarkdown();
}

function handleJsonDownload() {
  finalReportRef.value?.downloadJson();
}

function elapsedMin(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
}

function sanitizeReportHtml(html?: string | null): string {
  if (!html || typeof document === 'undefined') return '';

  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML;
}
</script>

<template>
  <section class="bnc-report">
    <FabBearProgressLoader v-if="loading" tone="panel" label="리포트를 불러오는 중입니다" />
    <p v-else-if="errorMessage" class="bnc-report__state bnc-report__state--error">{{ errorMessage }}</p>
    <p v-else-if="!report" class="bnc-report__state">
      리포트가 아직 생성되지 않았습니다. Report Agent 완료 및 HITL 승인 후 표시됩니다.
    </p>

    <template v-else>
      <template v-if="report.finalReport">
        <header class="bnc-report__header">
          <div class="bnc-report__header-meta">
            <h3 class="bnc-report__title">AI 대응 리포트 전문</h3>
            <div class="bnc-report__header-sub">
              <span>생성 {{ report.finalReport.meta.generated_at }}</span>
              <span>대상 {{ report.finalReport.meta.process_name }}</span>
              <span v-if="report.qdrantIndexed" class="bnc-report__indexed">유사 사례 색인됨</span>
            </div>
          </div>
          <div class="bnc-report__actions">
            <BaseButton size="sm" :disabled="isDownloading" @click="handlePdfDownload">
              <Printer :size="14" />
              {{ isDownloading ? 'PDF 생성 중…' : '인쇄용 PDF' }}
            </BaseButton>
            <BaseButton variant="ghost" size="sm" @click="handleMarkdownDownload">
              <FileText :size="14" />
              Markdown
            </BaseButton>
            <BaseButton variant="ghost" size="sm" @click="handleJsonDownload">
              <FileJson :size="14" />
              JSON
            </BaseButton>
            <BaseButton variant="ghost" size="sm" :disabled="aiBusy" @click="$emit('askAi')">
              <MessageCircle :size="14" />
              {{ aiBusy ? 'AI 분석 중…' : '대화에서 더 물어보기' }}
            </BaseButton>
          </div>
        </header>

        <FinalBottleneckReportView ref="finalReportRef" :report="report.finalReport" />
      </template>

      <template v-else>
        <!-- 헤더 -->
        <header class="bnc-report__header">
          <div class="bnc-report__header-meta">
            <h3 class="bnc-report__title">AI 대응 리포트</h3>
            <div class="bnc-report__header-sub">
              <span>생성 {{ formatKoMonthDayTime(report.generatedAt) }}</span>
              <span v-if="report.regeneratedCount > 0" class="bnc-report__regen">
                재생성 {{ report.regeneratedCount }}회
              </span>
              <span v-if="report.qdrantIndexed" class="bnc-report__indexed">유사 사례 색인됨</span>
            </div>
          </div>
          <div class="bnc-report__actions">
            <BaseButton
              v-if="report.hasPdf"
              variant="ghost"
              size="sm"
              :disabled="isDownloading"
              @click="handleBackendPdfDownload(report.caseId)"
            >
              <Printer :size="14" />
              {{ isDownloading ? 'PDF 다운로드 중…' : 'PDF 다운로드' }}
            </BaseButton>
            <BaseButton variant="ghost" size="sm" :disabled="aiBusy" @click="$emit('askAi')">
              <MessageCircle :size="14" />
              {{ aiBusy ? 'AI 분석 중…' : '대화에서 더 물어보기' }}
            </BaseButton>
          </div>
        </header>

        <!-- eslint-disable-next-line vue/no-v-html -- reportHtml is sanitized by sanitizeReportHtml before rendering. -->
        <article v-if="report.reportHtml" class="bnc-report__html" v-html="sanitizeReportHtml(report.reportHtml)" />

        <template v-else>
          <!-- 요약 (TL;DR) -->
          <div class="bnc-report__summary-card">
            <span class="bnc-report__summary-label">요약</span>
            <p class="bnc-report__summary-text">{{ report.summary }}</p>
          </div>

          <!-- 주요 원인 -->
          <section class="bnc-report__section">
            <h4 class="bnc-report__section-title">주요 원인</h4>
            <p class="bnc-report__body-text">{{ report.rootCauseText }}</p>
          </section>

          <!-- 대응안 비교 -->
          <section class="bnc-report__section">
            <h4 class="bnc-report__section-title">대응안 비교 및 결론</h4>
            <p class="bnc-report__body-text bnc-report__body-text--highlight">{{ report.actionComparisonText }}</p>
          </section>

          <!-- 대응 타임라인 -->
          <section class="bnc-report__section">
            <h4 class="bnc-report__section-title">대응 타임라인</h4>
            <ol class="bnc-report__timeline">
              <li v-for="(item, i) in report.timeline" :key="`${item.time}-${item.event}`" class="bnc-report__tl-item">
                <div class="bnc-report__tl-track">
                  <span class="bnc-report__tl-dot" />
                  <span v-if="i < report.timeline.length - 1" class="bnc-report__tl-connector">
                    <span class="bnc-report__tl-line" />
                    <span class="bnc-report__tl-elapsed">
                      +{{ elapsedMin(item.time, report.timeline[i + 1].time) }}분
                    </span>
                  </span>
                </div>
                <div class="bnc-report__tl-body">
                  <time class="bnc-report__tl-time">{{ formatKoMonthDayTime(item.time) }}</time>
                  <p class="bnc-report__tl-event">{{ item.event }}</p>
                </div>
              </li>
            </ol>
          </section>
        </template>
      </template>
    </template>
  </section>
</template>

<style scoped>
.bnc-report {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.bnc-report__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}
.bnc-report__state--error {
  color: var(--color-status-danger);
}

/* 헤더 */
.bnc-report__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.bnc-report__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: var(--space-2);
}

.bnc-report__actions :deep(button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.bnc-report__header-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.bnc-report__title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.bnc-report__header-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-report__regen {
  padding: 1px var(--space-2);
  background: color-mix(in srgb, var(--color-status-warning, var(--color-action-primary)) 12%, transparent);
  color: var(--color-fg-muted);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
}

.bnc-report__indexed {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-status-success);
  font-size: var(--font-size-xs);
}

.bnc-report__indexed::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.bnc-report__html {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  color: var(--color-fg-default);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  line-height: 1.7;
}

.bnc-report__html :deep(h1),
.bnc-report__html :deep(h2),
.bnc-report__html :deep(h3),
.bnc-report__html :deep(h4) {
  margin: var(--space-4) 0 var(--space-2);
  color: var(--color-fg-strong);
  line-height: 1.35;
}

.bnc-report__html :deep(h1:first-child),
.bnc-report__html :deep(h2:first-child),
.bnc-report__html :deep(h3:first-child) {
  margin-top: 0;
}

.bnc-report__html :deep(p),
.bnc-report__html :deep(ul),
.bnc-report__html :deep(ol),
.bnc-report__html :deep(table) {
  margin: 0 0 var(--space-3);
}

.bnc-report__html :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.bnc-report__html :deep(th),
.bnc-report__html :deep(td) {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-subtle);
  text-align: left;
  vertical-align: top;
}

.bnc-report__html :deep(th) {
  background: var(--color-bg-surface);
  color: var(--color-fg-strong);
}

/* 요약 카드 */
.bnc-report__summary-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-left: 3px solid var(--color-action-primary);
  border-radius: var(--radius-md);
}

.bnc-report__summary-label {
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.bnc-report__summary-text {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  line-height: 1.65;
  white-space: pre-wrap;
}

/* 섹션 */
.bnc-report__section {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-report__section-title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-report__body-text {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.7;
  white-space: pre-wrap;
}

.bnc-report__body-text--highlight {
  padding: var(--space-3);
  background: color-mix(in srgb, var(--color-status-success) 6%, var(--color-bg-page));
  border: 1px solid color-mix(in srgb, var(--color-status-success) 20%, var(--color-border-subtle));
  border-radius: var(--radius-md);
}

/* 타임라인 */
.bnc-report__timeline {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bnc-report__tl-item {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.bnc-report__tl-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 13px;
}

.bnc-report__tl-dot {
  display: block;
  flex-shrink: 0;
  width: 13px;
  height: 13px;
  margin-top: 3px;
  background: var(--color-action-primary);
  border-radius: 50%;
}

.bnc-report__tl-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-1) 0;
}

.bnc-report__tl-line {
  flex: 1;
  width: 2px;
  min-height: 8px;
  background: var(--color-border-subtle);
  border-radius: 1px;
}

.bnc-report__tl-elapsed {
  color: var(--color-fg-muted);
  font-size: 10px;
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

.bnc-report__tl-body {
  padding-bottom: var(--space-4);
  min-width: 0;
}

.bnc-report__tl-item:last-child .bnc-report__tl-body {
  padding-bottom: 0;
}

.bnc-report__tl-time {
  display: block;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  margin-bottom: 2px;
}

.bnc-report__tl-event {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
</style>
