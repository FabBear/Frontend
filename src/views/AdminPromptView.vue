<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { fetchAdminPrompts, updatePromptVersion } from '@/services/adminService';

import type { AdminPromptTemplate, AdminPromptVersion } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';

const templates = ref<AdminPromptTemplate[]>([]);
const allVersions = ref<AdminPromptVersion[]>([]);
const selectedId = ref('');
const selectedVersionId = ref<string | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');

const editBody = ref('');
const editReason = ref('');
const isSaving = ref(false);
const saveError = ref('');

const visibleTemplates = computed(() => templates.value);

const selectedTemplate = computed(() => visibleTemplates.value.find((template) => template.id === selectedId.value));

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

const isEditable = computed(() => selectedVersion.value?.status === 'ACTIVE');

const isDirty = computed(() => editBody.value !== (selectedVersion.value?.body ?? ''));

const versionColumns: BaseTableColumn[] = [
  { key: 'version', label: '버전' },
  { key: 'updatedAt', label: '생성일' },
  { key: 'updatedBy', label: '생성자' },
  { key: 'changeReason', label: '변경 사유' },
  { key: 'status', label: '상태' },
];

watch(selectedTemplate, () => {
  selectedVersionId.value = activeVersion.value?.id ?? versions.value[0]?.id ?? null;
});

watch(
  selectedVersion,
  (v) => {
    editBody.value = v?.body ?? '';
    editReason.value = '';
    saveError.value = '';
  },
  { immediate: true }
);

async function saveEdit() {
  const category = selectedTemplate.value?.category;
  if (!category || !editBody.value.trim()) {
    saveError.value = '프롬프트 본문을 입력하세요.';
    return;
  }
  const originalTokens = [...(selectedVersion.value?.body ?? '').matchAll(/\{[^}]+\}/g)].map((m) => m[0]);
  const editedSet = new Set([...editBody.value.matchAll(/\{[^}]+\}/g)].map((m) => m[0]));
  const missing = originalTokens.filter((t) => !editedSet.has(t));
  if (missing.length) {
    saveError.value = `다음 변수 토큰은 삭제할 수 없습니다: ${missing.join(', ')}`;
    return;
  }
  isSaving.value = true;
  saveError.value = '';
  try {
    await updatePromptVersion(category, editBody.value, editReason.value);
    await loadPrompts();
  } catch (error) {
    console.error(error);
    saveError.value = '저장에 실패했습니다. 다시 시도해 주세요.';
  } finally {
    isSaving.value = false;
  }
}

async function loadPrompts() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const result = await fetchAdminPrompts();
    templates.value = result.templates;
    allVersions.value = result.versions;
    const firstVisible = visibleTemplates.value[0];
    selectedId.value = firstVisible?.id ?? '';
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
        <h1>프롬프트 관리</h1>
        <p>DB에 등록된 Agent 프롬프트의 활성 버전과 이력을 확인합니다.</p>
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
      <nav class="admin-prompt-view__tabs" role="tablist" aria-label="Agent 프롬프트 탭">
        <button
          v-for="template in visibleTemplates"
          :key="template.id"
          class="admin-prompt-view__tab"
          :class="{ 'admin-prompt-view__tab--active': template.id === selectedId }"
          type="button"
          role="tab"
          :aria-selected="template.id === selectedId"
          @click="selectTemplate(template)"
        >
          {{ template.label }}
        </button>
      </nav>

      <div v-if="selectedTemplate && selectedVersion" class="admin-prompt-view__meta-bar surface-card">
        <div class="admin-prompt-view__meta-left">
          <BaseBadge :variant="selectedVersion.status === 'ACTIVE' ? 'success' : 'info'">
            {{ selectedVersion.status === 'ACTIVE' ? '활성' : '이전' }} {{ selectedVersion.version }}
          </BaseBadge>
          <span v-if="selectedTemplate.purpose" class="admin-prompt-view__meta-item">
            <span class="admin-prompt-view__meta-label">목적</span>{{ selectedTemplate.purpose }}
          </span>
          <span v-if="selectedTemplate.inputSpec" class="admin-prompt-view__meta-item">
            <span class="admin-prompt-view__meta-label">입력</span>{{ selectedTemplate.inputSpec }}
          </span>
          <span v-if="selectedTemplate.outputSpec" class="admin-prompt-view__meta-item">
            <span class="admin-prompt-view__meta-label">출력</span>{{ selectedTemplate.outputSpec }}
          </span>
        </div>
        <button class="admin-prompt-view__compare-btn" type="button" disabled>템플릿 비교</button>
      </div>

      <section v-if="selectedTemplate && selectedVersion" class="admin-prompt-view__card surface-card">
        <div class="admin-prompt-view__two-col">
          <div class="admin-prompt-view__prompt-pane">
            <h2>프롬프트 본문</h2>
            <textarea
              v-if="isEditable"
              v-model="editBody"
              class="admin-prompt-view__editor"
              spellcheck="false"
              aria-label="프롬프트 본문 편집"
            ></textarea>
            <pre v-else class="admin-prompt-view__preview">{{ selectedVersion.body }}</pre>
            <template v-if="isEditable">
              <p v-if="saveError" class="admin-prompt-view__save-error">{{ saveError }}</p>
              <div class="admin-prompt-view__save-row">
                <input
                  v-model="editReason"
                  class="admin-prompt-view__reason"
                  type="text"
                  maxlength="500"
                  placeholder="변경 사유 (선택)"
                />
                <BaseButton size="sm" :disabled="!isDirty || isSaving" @click="saveEdit">
                  {{ isSaving ? '저장 중…' : '저장' }}
                </BaseButton>
              </div>
            </template>
          </div>

          <div class="admin-prompt-view__var-pane">
            <h2>사용 가능한 변수</h2>
            <dl v-if="selectedTemplate.variables?.length" class="admin-prompt-view__var-list">
              <div v-for="v in selectedTemplate.variables" :key="v.token" class="admin-prompt-view__var-row">
                <dt class="admin-prompt-view__var-token">{{ v.token }}</dt>
                <dd>{{ v.description }}</dd>
              </div>
            </dl>
            <p v-else class="admin-prompt-view__var-empty">이 Agent에는 고정 변수가 없습니다.</p>
            <p class="admin-prompt-view__var-note">변수는 DB variables_schema 기준으로 표시됩니다.</p>
          </div>
        </div>
      </section>

      <section class="admin-prompt-view__card surface-card">
        <div class="admin-prompt-view__section-title">
          <h2>버전 이력</h2>
          <p>이전 버전을 선택하면 위 미리보기에서 해당 본문을 확인할 수 있습니다.</p>
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
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  padding-bottom: var(--space-2);
}

.admin-prompt-view__header > div {
  display: grid;
  gap: var(--space-1);
}

.admin-prompt-view__card {
  padding: var(--space-4);
}

.admin-prompt-view__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: 0 var(--space-4);
}

.admin-prompt-view__tab {
  padding: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.admin-prompt-view__tab:hover {
  color: var(--color-fg-strong);
}

.admin-prompt-view__tab--active {
  color: var(--color-action-primary);
  border-bottom-color: var(--color-action-primary);
}

.admin-prompt-view__meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.admin-prompt-view__meta-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
}

.admin-prompt-view__meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.admin-prompt-view__meta-label {
  color: var(--color-fg-subtle);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}

.admin-prompt-view__compare-btn {
  font-size: var(--font-size-sm);
  color: var(--color-fg-subtle);
  background: none;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  cursor: not-allowed;
  opacity: 0.5;
}

.admin-prompt-view__two-col {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: var(--space-5);
  align-items: start;
}

.admin-prompt-view__prompt-pane {
  display: grid;
  gap: var(--space-3);
}

.admin-prompt-view__editor {
  width: 100%;
  resize: vertical;
  min-height: 280px;
  border: 1px solid var(--color-action-primary-border, var(--color-border-default));
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  padding: var(--space-3);
  color: var(--color-fg-strong);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

.admin-prompt-view__preview {
  overflow: auto;
  margin: 0;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  padding: var(--space-3);
  color: var(--color-fg-strong);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
  white-space: pre-wrap;
  word-break: break-word;
}

.admin-prompt-view__save-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.admin-prompt-view__reason {
  flex: 1;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg-strong);
  font: inherit;
  font-size: var(--font-size-sm);
}

.admin-prompt-view__save-error {
  color: var(--color-risk-high);
  font-size: var(--font-size-sm);
  margin: 0;
}

.admin-prompt-view__var-pane {
  display: grid;
  gap: var(--space-3);
  align-content: start;
}

.admin-prompt-view__var-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.admin-prompt-view__var-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.admin-prompt-view__var-token {
  color: var(--color-action-primary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  flex-shrink: 0;
}

.admin-prompt-view__var-empty {
  color: var(--color-fg-subtle);
  font-size: var(--font-size-sm);
  margin: 0;
}

.admin-prompt-view__var-note {
  font-size: var(--font-size-xs);
  color: var(--color-fg-subtle);
  line-height: var(--line-height-relaxed);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-2);
  margin-top: var(--space-1);
  margin-bottom: 0;
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

h1,
h2,
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

p,
dd {
  color: var(--color-fg-muted);
}

dt {
  margin: 0;
}

dd {
  margin: 0;
  min-width: 0;
  word-break: break-word;
  font-size: var(--font-size-sm);
}
</style>
