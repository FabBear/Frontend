<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { fetchAdminPrompts } from '@/services/adminService';

import type { AdminPromptTemplate, AdminPromptVersion } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';

interface PromptBlock {
  key: string;
  title: string;
  body: string;
  masked: boolean;
}

const templates = ref<AdminPromptTemplate[]>([]);
const allVersions = ref<AdminPromptVersion[]>([]);
const selectedId = ref('');
const selectedVersionId = ref<string | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');

const selectedTemplate = computed(() => templates.value.find((template) => template.id === selectedId.value));

const versions = computed(() =>
  allVersions.value
    .filter((version) => version.templateId === selectedTemplate.value?.id)
    .slice()
    .sort((a, b) => (b.versionNo ?? 0) - (a.versionNo ?? 0))
);

const activeVersion = computed(
  () => versions.value.find((version) => version.status === 'ACTIVE') ?? versions.value[0]
);

const selectedVersion = computed(
  () => versions.value.find((version) => version.id === selectedVersionId.value) ?? activeVersion.value
);

const displaySchema = computed(
  () => selectedVersion.value?.variablesSchema ?? selectedTemplate.value?.variablesSchema ?? null
);

const variables = computed(() => displaySchema.value?.variables ?? selectedTemplate.value?.variables ?? []);
const hiddenSections = computed(() => displaySchema.value?.hiddenSections ?? []);
const promptBlocks = computed(() => parsePromptBody(selectedVersion.value?.body ?? ''));

const versionColumns: BaseTableColumn[] = [
  { key: 'version', label: '버전' },
  { key: 'updatedAt', label: '생성일' },
  { key: 'updatedBy', label: '생성자' },
  { key: 'changeReason', label: '변경 사유' },
  { key: 'status', label: '상태' },
];

function parsePromptBody(body: string): PromptBlock[] {
  const blocks: PromptBlock[] = [];
  let current: PromptBlock | null = null;
  let maskedBlock: PromptBlock | null = null;

  const pushBlock = (title: string, masked = false) => {
    const block: PromptBlock = {
      key: `${blocks.length}-${title}`,
      title,
      body: '',
      masked,
    };
    blocks.push(block);
    return block;
  };

  body.split('\n').forEach((line) => {
    const trimmed = line.trim();
    const titleMatch = trimmed.match(/^#\s+(.+)$/);
    const sectionMatch = trimmed.match(/^##\s+(.+)$/);
    const bracketSectionMatch = trimmed.match(/^\[(?!MASKED:)(.+)]$/);
    const maskedMatch = trimmed.match(/^\[MASKED:\s*(.+)]$/);

    if (titleMatch) {
      current = pushBlock('프롬프트 이름');
      maskedBlock = null;
      current.body = titleMatch[1];
      return;
    }

    if (sectionMatch) {
      current = pushBlock(sectionMatch[1]);
      maskedBlock = null;
      return;
    }

    if (bracketSectionMatch) {
      current = pushBlock(bracketSectionMatch[1]);
      maskedBlock = null;
      return;
    }

    if (maskedMatch) {
      if (!maskedBlock) maskedBlock = pushBlock('비공개 마스킹 영역', true);
      maskedBlock.body += `${maskedBlock.body ? '\n' : ''}${maskedMatch[1]}`;
      current = null;
      return;
    }

    if (!trimmed && !current) return;
    if (!current) current = pushBlock('프롬프트 본문');
    current.body += `${current.body ? '\n' : ''}${line}`;
  });

  return blocks.filter((block) => block.body.trim().length > 0);
}

function formatExposure(value: string | undefined) {
  if (value === 'masked_prompt_preview') return '실제 형식 · 민감 영역 마스킹';
  if (value === 'sanitized_summary') return '제한 공개';
  return value ?? '실제 형식 · 민감 영역 마스킹';
}

watch(selectedTemplate, () => {
  selectedVersionId.value = activeVersion.value?.id ?? versions.value[0]?.id ?? null;
});

async function loadPrompts() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const result = await fetchAdminPrompts();
    templates.value = result.templates;
    allVersions.value = result.versions;
    selectedId.value = result.templates[0]?.id ?? '';
    selectedVersionId.value =
      result.versions.find((version) => version.templateId === selectedId.value && version.status === 'ACTIVE')?.id ??
      null;
  } catch (error) {
    console.error(error);
    errorMessage.value = '프롬프트 카탈로그를 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
}

function selectTemplate(template: AdminPromptTemplate) {
  selectedId.value = template.id;
}

function handleVersionClick(row: BaseTableRow) {
  if (typeof row.id === 'string') selectedVersionId.value = row.id;
}

function toRow(version: AdminPromptVersion): BaseTableRow {
  return { ...version };
}

onMounted(() => {
  void loadPrompts();
});
</script>

<template>
  <div class="admin-prompt-view">
    <header class="admin-prompt-view__header">
      <div>
        <div class="admin-prompt-view__title-row">
          <h1>프롬프트 관리</h1>
        </div>
        <p>
          Agent별 활성 프롬프트와 이전 버전을 확인합니다. 실제 프롬프트 구조는 유지하고 민감한 운영 규칙만 마스킹합니다.
        </p>
      </div>
    </header>

    <section v-if="isLoading" class="admin-prompt-view__card surface-card admin-prompt-view__state">
      프롬프트 카탈로그를 불러오는 중입니다.
    </section>

    <section v-else-if="errorMessage" class="admin-prompt-view__card surface-card admin-prompt-view__state">
      <span>{{ errorMessage }}</span>
      <BaseButton size="sm" variant="soft" @click="loadPrompts">다시 불러오기</BaseButton>
    </section>

    <template v-else>
      <section class="admin-prompt-view__tabs surface-card" aria-label="Agent prompt tabs">
        <button
          v-for="template in templates"
          :key="template.id"
          :class="{ 'admin-prompt-view__tab--active': template.id === selectedId }"
          type="button"
          @click="selectTemplate(template)"
        >
          {{ template.label }}
        </button>
      </section>

      <section v-if="selectedTemplate && selectedVersion" class="admin-prompt-view__layout">
        <div class="admin-prompt-view__card surface-card admin-prompt-view__prompt-card">
          <div class="admin-prompt-view__card-head">
            <div class="admin-prompt-view__card-meta">
              <BaseBadge :variant="selectedVersion.status === 'ACTIVE' ? 'success' : 'info'">
                {{ selectedVersion.status === 'ACTIVE' ? '활성' : '이전' }} {{ selectedVersion.version }}
              </BaseBadge>
              <span>{{ selectedVersion.updatedAt }} · {{ selectedVersion.updatedBy }}</span>
            </div>
            <BaseBadge variant="warning">마스킹 미리보기</BaseBadge>
          </div>

          <div class="admin-prompt-view__section-title">
            <h2>{{ selectedTemplate.label }}</h2>
            <p>{{ selectedTemplate.description }}</p>
          </div>

          <dl class="admin-prompt-view__summary-strip">
            <div>
              <dt>공개 방식</dt>
              <dd>{{ formatExposure(displaySchema?.exposure) }}</dd>
            </div>
            <div>
              <dt>변경 사유</dt>
              <dd>{{ selectedVersion.changeReason }}</dd>
            </div>
          </dl>

          <div class="admin-prompt-view__prompt-preview" aria-label="Masked prompt preview">
            <section
              v-for="block in promptBlocks"
              :key="block.key"
              class="admin-prompt-view__prompt-block"
              :class="{ 'admin-prompt-view__prompt-block--masked': block.masked }"
            >
              <header>
                <span>{{ block.masked ? '[MASKED]' : '##' }}</span>
                <h3>{{ block.title }}</h3>
              </header>
              <pre>{{ block.body }}</pre>
            </section>
          </div>
        </div>

        <aside class="admin-prompt-view__card surface-card">
          <h2>변수 스키마</h2>
          <dl v-if="variables.length" class="admin-prompt-view__schema-list">
            <div v-for="variable in variables" :key="variable.token">
              <dt>
                <code>{{ variable.token }}</code>
              </dt>
              <dd>{{ variable.description }}</dd>
            </div>
          </dl>
          <p v-else class="admin-prompt-view__schema-note">공개 가능한 변수 스키마가 없습니다.</p>

          <div v-if="hiddenSections.length" class="admin-prompt-view__aside-block">
            <h3>마스킹 영역</h3>
            <div class="admin-prompt-view__chips admin-prompt-view__chips--muted">
              <span v-for="section in hiddenSections" :key="section">{{ section }}</span>
            </div>
          </div>

          <h2>운영 메타</h2>
          <dl class="admin-prompt-view__meta-list">
            <div>
              <dt>Agent Key</dt>
              <dd>{{ selectedTemplate.category }}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{{ displaySchema?.sourcePath ?? '-' }}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{{ displaySchema?.runtimeUsage ?? '-' }}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section class="admin-prompt-view__card surface-card">
        <div class="admin-prompt-view__section-title">
          <h2>버전 이력</h2>
          <p>이전 버전은 선택해서 내용을 확인할 수 있습니다.</p>
        </div>
        <BaseTable
          :columns="versionColumns"
          :rows="versions.map(toRow)"
          :selected-row-key="selectedVersion?.id"
          row-key="id"
          @row-click="handleVersionClick"
        >
          <template #cell-status="{ value }">
            <BaseBadge :variant="value === 'ACTIVE' ? 'success' : 'info'">
              {{ value === 'ACTIVE' ? '활성' : '이전' }}
            </BaseBadge>
          </template>
        </BaseTable>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-prompt-view,
.admin-prompt-view__card {
  display: grid;
  gap: var(--space-4);
}

.admin-prompt-view__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-3);
}

.admin-prompt-view__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.admin-prompt-view__tabs,
.admin-prompt-view__card {
  padding: var(--space-4);
}

.admin-prompt-view__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.admin-prompt-view__tabs button {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
}

.admin-prompt-view__tab--active {
  border-color: var(--color-action-primary) !important;
  background: var(--color-action-primary-soft) !important;
  color: var(--color-action-primary) !important;
}

.admin-prompt-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.85fr);
  gap: var(--space-4);
  align-items: start;
}

.admin-prompt-view__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.admin-prompt-view__card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-width: 0;
}

.admin-prompt-view__section-title {
  display: grid;
  gap: var(--space-1);
}

.admin-prompt-view__state {
  align-items: center;
  justify-items: start;
  color: var(--color-fg-muted);
}

.admin-prompt-view__prompt-card {
  align-content: start;
}

.admin-prompt-view__summary-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
}

.admin-prompt-view__summary-strip div {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  border-right: 1px solid var(--color-border-subtle);
  padding: var(--space-3);
}

.admin-prompt-view__summary-strip div:last-child {
  border-right: 0;
}

.admin-prompt-view__summary-strip dd {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
}

.admin-prompt-view__prompt-preview {
  overflow: hidden;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
}

.admin-prompt-view__prompt-block {
  display: grid;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
  padding: var(--space-3);
}

.admin-prompt-view__prompt-block:last-child {
  border-bottom: 0;
}

.admin-prompt-view__prompt-block header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.admin-prompt-view__prompt-block header span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border-radius: var(--radius-sm);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  padding: 0 7px;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.admin-prompt-view__prompt-block pre {
  overflow: auto;
  margin: 0;
  color: var(--color-fg-strong);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
  line-height: var(--line-height-relaxed);
}

.admin-prompt-view__prompt-block--masked {
  background: color-mix(in srgb, var(--color-risk-high) 5%, var(--color-bg-surface));
}

.admin-prompt-view__prompt-block--masked header span {
  background: color-mix(in srgb, var(--color-risk-high) 12%, var(--color-bg-surface));
  color: var(--color-risk-high);
}

.admin-prompt-view__prompt-block--masked pre {
  color: color-mix(in srgb, var(--color-risk-high) 72%, var(--color-fg-strong));
}

.admin-prompt-view__meta-list,
.admin-prompt-view__schema-list {
  display: grid;
  gap: 0;
}

.admin-prompt-view__meta-list div,
.admin-prompt-view__schema-list div {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

.admin-prompt-view__meta-list div {
  grid-template-columns: 88px minmax(0, 1fr);
}

.admin-prompt-view__meta-list div:last-child,
.admin-prompt-view__schema-list div:last-child {
  border-bottom: 0;
}

.admin-prompt-view__aside-block {
  display: grid;
  gap: var(--space-2);
}

.admin-prompt-view__schema-note {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  padding: var(--space-2) var(--space-3);
}

.admin-prompt-view__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.admin-prompt-view__chips span {
  border: 1px solid var(--color-action-primary-border);
  border-radius: var(--radius-sm);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  padding: 3px 8px;
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.admin-prompt-view__chips--muted span {
  border-color: var(--color-border-subtle);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
}

h1,
h2,
h3,
p,
dl {
  margin: 0;
}

h1 {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}

h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

p,
span,
dd {
  color: var(--color-fg-muted);
}

dt {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

dd {
  margin: 0;
  min-width: 0;
  word-break: break-word;
}

code {
  color: var(--color-fg-strong);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}

@media (max-width: 980px) {
  .admin-prompt-view__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-prompt-view__layout {
    grid-template-columns: 1fr;
  }

  .admin-prompt-view__summary-strip {
    grid-template-columns: 1fr;
  }

  .admin-prompt-view__summary-strip div {
    border-right: 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .admin-prompt-view__summary-strip div:last-child {
    border-bottom: 0;
  }
}
</style>
