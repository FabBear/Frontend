<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useAuthStore } from '@/stores/auth';

import { MOCK_PROMPT_TEMPLATES, MOCK_PROMPT_VERSIONS } from '@/constants/mockData/admin';

import type { AdminPromptTemplate, AdminPromptVersion } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseModal from '@/components/base/BaseModal.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';

const authStore = useAuthStore();

const templates = ref(MOCK_PROMPT_TEMPLATES.map((t) => ({ ...t, variables: [...t.variables] })));
const allVersions = ref(MOCK_PROMPT_VERSIONS.map((v) => ({ ...v })));
const selectedId = ref(templates.value[0]?.id ?? '');

const isEditing = ref(false);
const editBody = ref('');
const editReason = ref('');
const editErrors = ref<{ body?: string; reason?: string }>({});
const isPendingSave = ref(false);
const pendingRestoreVersion = ref<AdminPromptVersion | null>(null);

const selectedTemplate = computed(() => templates.value.find((t) => t.id === selectedId.value) ?? templates.value[0]);

const versions = computed(() =>
  allVersions.value
    .filter((v) => v.templateId === selectedTemplate.value?.id)
    .slice()
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
);

watch(selectedTemplate, () => {
  if (isEditing.value) cancelEdit();
});

const versionColumns: BaseTableColumn[] = [
  { key: 'version', label: '버전' },
  { key: 'updatedAt', label: '생성일' },
  { key: 'updatedBy', label: '생성자' },
  { key: 'changeReason', label: '변경 사유' },
  { key: 'status', label: '상태' },
  { key: '_action', label: '' },
];

function selectTemplate(template: AdminPromptTemplate) {
  selectedId.value = template.id;
}

function startEdit() {
  if (!selectedTemplate.value) return;
  editBody.value = selectedTemplate.value.body;
  editReason.value = '';
  editErrors.value = {};
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  editBody.value = '';
  editReason.value = '';
  editErrors.value = {};
  isPendingSave.value = false;
}

function requestSave() {
  const errors: { body?: string; reason?: string } = {};
  if (!editBody.value.trim()) {
    errors.body = '프롬프트 내용을 입력하세요.';
  } else if (editBody.value === selectedTemplate.value?.body) {
    errors.body = '변경된 내용이 없습니다.';
  }
  if (!editReason.value.trim()) errors.reason = '변경 사유를 입력하세요.';
  editErrors.value = errors;
  if (Object.keys(errors).length > 0) return;
  isPendingSave.value = true;
}

function confirmSave() {
  if (!selectedTemplate.value) return;
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const updatedBy = authStore.user?.loginId ?? 'admin';
  const templateId = selectedTemplate.value.id;

  const versionCount = allVersions.value.filter((v) => v.templateId === templateId).length;
  const nextVersion = `v${versionCount + 1}`;

  allVersions.value = allVersions.value.map((v) =>
    v.templateId === templateId ? { ...v, status: 'PREVIOUS' as const } : v
  );
  allVersions.value.push({
    id: `${templateId.toLowerCase()}-${nextVersion}`,
    templateId,
    version: nextVersion,
    body: editBody.value,
    updatedAt: now,
    updatedBy,
    changeReason: editReason.value,
    status: 'ACTIVE',
  });
  templates.value = templates.value.map((t) =>
    t.id === templateId
      ? {
          ...t,
          body: editBody.value,
          activeVersion: nextVersion,
          updatedAt: now,
          updatedBy,
          changeReason: editReason.value,
        }
      : t
  );

  isPendingSave.value = false;
  cancelEdit();
}

function handleRestoreClick(row: BaseTableRow) {
  const version = versions.value.find((v) => v.id === row.id);
  if (version) pendingRestoreVersion.value = version;
}

function confirmRestore() {
  if (!pendingRestoreVersion.value || !selectedTemplate.value) return;
  const v = pendingRestoreVersion.value;
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const updatedBy = authStore.user?.loginId ?? 'admin';
  const templateId = selectedTemplate.value.id;

  const versionCount = allVersions.value.filter((ver) => ver.templateId === templateId).length;
  const nextVersion = `v${versionCount + 1}`;

  allVersions.value = allVersions.value.map((ver) =>
    ver.templateId === templateId ? { ...ver, status: 'PREVIOUS' as const } : ver
  );
  allVersions.value.push({
    id: `${templateId.toLowerCase()}-${nextVersion}`,
    templateId,
    version: nextVersion,
    body: v.body,
    updatedAt: now,
    updatedBy,
    changeReason: `${v.version} 복원`,
    status: 'ACTIVE',
  });
  templates.value = templates.value.map((t) =>
    t.id === templateId
      ? { ...t, body: v.body, activeVersion: nextVersion, updatedAt: now, updatedBy, changeReason: `${v.version} 복원` }
      : t
  );

  pendingRestoreVersion.value = null;
}

function toRow(version: AdminPromptVersion): BaseTableRow {
  return { ...version };
}
</script>

<template>
  <div class="admin-prompt-view">
    <header class="admin-prompt-view__header">
      <div>
        <h1>프롬프트 관리</h1>
        <p>Agent 카테고리별 활성 프롬프트와 버전 이력을 관리합니다.</p>
      </div>
      <BaseBadge variant="info">카테고리당 활성 1개</BaseBadge>
    </header>

    <section class="admin-prompt-view__tabs surface-card">
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

    <section v-if="selectedTemplate" class="admin-prompt-view__layout">
      <div class="admin-prompt-view__card surface-card">
        <div class="admin-prompt-view__card-head">
          <div class="admin-prompt-view__card-meta">
            <BaseBadge variant="success">활성 {{ selectedTemplate.activeVersion }}</BaseBadge>
            <span>{{ selectedTemplate.updatedAt }} · {{ selectedTemplate.updatedBy }}</span>
          </div>
          <div class="admin-prompt-view__edit-actions">
            <template v-if="!isEditing">
              <BaseButton size="sm" variant="ghost" @click="startEdit">편집</BaseButton>
            </template>
            <template v-else>
              <BaseButton size="sm" @click="requestSave">저장</BaseButton>
              <BaseButton size="sm" variant="ghost" @click="cancelEdit">취소</BaseButton>
            </template>
          </div>
        </div>

        <h2>활성 프롬프트</h2>

        <pre v-if="!isEditing">{{ selectedTemplate.body }}</pre>

        <div v-else class="admin-prompt-view__edit-area">
          <div>
            <textarea
              v-model="editBody"
              class="admin-prompt-view__textarea"
              :class="{ 'admin-prompt-view__textarea--error': editErrors.body }"
              spellcheck="false"
            />
            <small v-if="editErrors.body" class="admin-prompt-view__field-error">{{ editErrors.body }}</small>
          </div>
          <label class="admin-prompt-view__reason-label">
            <span>변경 사유 <em>(필수)</em></span>
            <BaseInput v-model="editReason" placeholder="예: 출력 형식 개선, 오타 수정..." />
            <small v-if="editErrors.reason" class="admin-prompt-view__field-error">{{ editErrors.reason }}</small>
          </label>
        </div>
      </div>

      <aside class="admin-prompt-view__card surface-card">
        <h2>변수 스키마</h2>
        <dl>
          <div v-for="variable in selectedTemplate.variables" :key="variable.token">
            <dt>
              <code>{{ variable.token }}</code>
            </dt>
            <dd>{{ variable.description }}</dd>
          </div>
        </dl>
        <p class="admin-prompt-view__schema-note">
          변수는 Agent 실행 시 코드에서 자동 주입됩니다. 변수명은 수정하지 마세요.
        </p>
      </aside>
    </section>

    <section class="admin-prompt-view__card surface-card">
      <h2>버전 이력</h2>
      <BaseTable :columns="versionColumns" :rows="versions.map(toRow)" row-key="id">
        <template #cell-status="{ value }">
          <BaseBadge :variant="value === 'ACTIVE' ? 'success' : 'info'">
            {{ value === 'ACTIVE' ? '활성' : '이전' }}
          </BaseBadge>
        </template>
        <template #cell-_action="{ row }">
          <BaseButton v-if="row.status !== 'ACTIVE'" size="sm" variant="ghost" @click="handleRestoreClick(row)">
            복원
          </BaseButton>
        </template>
      </BaseTable>
    </section>
  </div>

  <BaseModal
    :model-value="isPendingSave"
    title="프롬프트 저장 확인"
    width="480px"
    @update:model-value="isPendingSave = $event"
  >
    <div class="admin-prompt-view__confirm">
      <p>새 버전으로 저장하고 즉시 활성화됩니다.</p>
      <dl>
        <div>
          <dt>대상 Agent</dt>
          <dd>{{ selectedTemplate?.label }}</dd>
        </div>
        <div>
          <dt>변경 사유</dt>
          <dd>{{ editReason }}</dd>
        </div>
      </dl>
      <p class="admin-prompt-view__confirm-warn">이전 버전은 버전 이력에서 언제든 복원할 수 있습니다.</p>
      <footer>
        <BaseButton size="sm" @click="confirmSave">저장</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="isPendingSave = false">취소</BaseButton>
      </footer>
    </div>
  </BaseModal>

  <BaseModal
    :model-value="Boolean(pendingRestoreVersion)"
    title="이전 버전 복원"
    width="480px"
    @update:model-value="pendingRestoreVersion = null"
  >
    <div v-if="pendingRestoreVersion" class="admin-prompt-view__confirm">
      <p>
        <strong>{{ pendingRestoreVersion.version }}</strong
        >의 내용을 새 버전으로 복원합니다.
      </p>
      <dl>
        <div>
          <dt>원본 생성일</dt>
          <dd>{{ pendingRestoreVersion.updatedAt }} · {{ pendingRestoreVersion.updatedBy }}</dd>
        </div>
        <div>
          <dt>원본 변경 사유</dt>
          <dd>{{ pendingRestoreVersion.changeReason }}</dd>
        </div>
      </dl>
      <p class="admin-prompt-view__confirm-warn">
        복원된 내용이 새 활성 버전으로 생성됩니다. 현재 활성 버전은 이전 상태로 변경됩니다.
      </p>
      <footer>
        <BaseButton size="sm" @click="confirmRestore">복원</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="pendingRestoreVersion = null">취소</BaseButton>
      </footer>
    </div>
  </BaseModal>
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
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.8fr);
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

.admin-prompt-view__edit-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

pre {
  overflow: auto;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  color: var(--color-fg-strong);
  padding: var(--space-3);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
  line-height: var(--line-height-relaxed);
}

.admin-prompt-view__edit-area {
  display: grid;
  gap: var(--space-3);
}

.admin-prompt-view__textarea {
  width: 100%;
  min-height: 360px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  color: var(--color-fg-strong);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
  padding: var(--space-3);
  resize: vertical;
  outline: none;
}

.admin-prompt-view__textarea:focus {
  border-color: var(--color-action-primary);
}

.admin-prompt-view__textarea--error {
  border-color: var(--color-risk-critical);
}

.admin-prompt-view__reason-label {
  display: grid;
  gap: var(--space-1);
}

.admin-prompt-view__field-error {
  color: var(--color-risk-critical);
  font-size: var(--font-size-xs);
}

.admin-prompt-view__schema-note {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  padding: var(--space-2) var(--space-3);
}

.admin-prompt-view__confirm {
  display: grid;
  gap: var(--space-4);
}

.admin-prompt-view__confirm dl {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.admin-prompt-view__confirm dl div {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: var(--space-3);
  align-items: start;
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-2);
}

.admin-prompt-view__confirm dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}

.admin-prompt-view__confirm dd {
  color: var(--color-fg-strong);
  font-weight: 600;
  margin: 0;
  word-break: break-word;
}

.admin-prompt-view__confirm-warn {
  border-left: 3px solid var(--color-risk-high);
  padding-left: var(--space-3);
  font-size: var(--font-size-sm);
}

.admin-prompt-view__confirm footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
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
span,
dd {
  color: var(--color-fg-muted);
}

.admin-prompt-view__reason-label span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-prompt-view__reason-label em {
  color: var(--color-risk-critical);
  font-size: var(--font-size-xs);
  font-style: normal;
}

strong,
code {
  color: var(--color-fg-strong);
}

dl div {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

dl div:last-child {
  border-bottom: 0;
}

dt {
  margin: 0;
}

dd {
  margin: 0;
}

code {
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
}
</style>
