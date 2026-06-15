<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { fetchMesFieldMappings, updateMesFieldMapping } from '@/services/adminService';

import type { AdminMesFieldMapping } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseModal from '@/components/base/BaseModal.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';

const authStore = useAuthStore();

const mappings = ref<AdminMesFieldMapping[]>([]);
const keyword = ref('');
const editingId = ref<string | null>(null);
const draft = ref<AdminMesFieldMapping | null>(null);
const isEditModalOpen = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref<string | null>(null);
const validationStatus = computed(() => ({
  state: missingRequiredCount.value > 0 ? ('warning' as const) : ('success' as const),
}));

const columns: BaseTableColumn[] = [
  { key: 'customerMetricName', label: '고객사 지표명' },
  { key: 'externalField', label: '고객사 MES 필드' },
  { key: 'internalField', label: 'fabBear 표준 필드' },
  { key: 'dataType', label: '타입' },
  { key: 'metricScope', label: '범위' },
  { key: 'transformRule', label: '변환 규칙' },
  { key: 'isRequired', label: '필수' },
  { key: 'isActive', label: '상태' },
  { key: 'action', label: '' },
];

const currentFabName = computed(() => authStore.user?.fabName ?? authStore.user?.fabId ?? 'Demo FAB');
const currentFabId = computed(() => authStore.user?.fabId ?? '');
const requiredCount = computed(() => mappings.value.filter((m) => m.isRequired).length);
const activeCount = computed(() => mappings.value.filter((m) => m.isActive).length);
// 고객사 외부 필드명과 내부 표준 필드명이 실제로 다른(=이름 정규화가 일어나는) 매핑 수.
const renamedCount = computed(() => mappings.value.filter((m) => m.externalField !== m.internalField).length);
const missingRequiredCount = computed(() => mappings.value.filter((m) => m.isRequired && !m.isActive).length);
const editingMapping = computed(() => mappings.value.find((m) => m.id === editingId.value) ?? null);

const filteredMappings = computed(() => {
  const value = keyword.value.trim().toLowerCase();
  if (!value) return mappings.value;
  return mappings.value.filter((m) =>
    `${m.customerMetricName} ${m.externalField} ${m.internalField} ${m.transformRule} ${m.metricScope}`
      .toLowerCase()
      .includes(value)
  );
});

function toRow(mapping: AdminMesFieldMapping): BaseTableRow {
  return { ...mapping };
}

function getMapping(row: BaseTableRow): AdminMesFieldMapping {
  return row as unknown as AdminMesFieldMapping;
}

function startEdit(mapping: AdminMesFieldMapping) {
  editingId.value = mapping.id;
  draft.value = { ...mapping };
  isEditModalOpen.value = true;
}

function cancelEdit() {
  editingId.value = null;
  draft.value = null;
  isEditModalOpen.value = false;
}

async function loadMappings() {
  if (!currentFabId.value) {
    errorMessage.value = '현재 Fab 정보를 확인하지 못했습니다.';
    return;
  }
  isLoading.value = true;
  errorMessage.value = null;
  try {
    mappings.value = await fetchMesFieldMappings(currentFabId.value);
  } catch {
    errorMessage.value = 'MES 필드 매핑을 불러오지 못했습니다.';
    mappings.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function saveEdit() {
  if (!draft.value) return;

  isSaving.value = true;
  errorMessage.value = null;
  try {
    const saved = await updateMesFieldMapping(draft.value.id, {
      externalField: draft.value.externalField,
      internalField: draft.value.internalField,
      transformRule: draft.value.transformRule,
    });
    mappings.value = mappings.value.map((m) => (m.id === saved.id ? saved : m));
    cancelEdit();
  } catch {
    errorMessage.value = 'MES 필드 매핑을 저장하지 못했습니다.';
  } finally {
    isSaving.value = false;
  }
}

function scopeLabel(scope: AdminMesFieldMapping['metricScope']) {
  const labels: Record<AdminMesFieldMapping['metricScope'], string> = {
    FAB: 'FAB',
    TOOL_GROUP: 'Tool Group',
    TOOL: 'Tool',
  };
  return labels[scope];
}

// 고객사 외부 필드명과 내부 표준 필드명이 동일하면 변환이 불필요한 매핑이다.
function isIdentityMapping(mapping: AdminMesFieldMapping): boolean {
  return mapping.externalField === mapping.internalField;
}

function transformDisplay(mapping: AdminMesFieldMapping): string {
  if (mapping.transformRule && mapping.transformRule.trim()) return mapping.transformRule;
  return isIdentityMapping(mapping) ? '동일 · 변환 불필요' : '표준 필드로 정규화';
}

onMounted(() => {
  void loadMappings();
});
</script>

<template>
  <div class="admin-mes-view">
    <header class="admin-mes-view__header">
      <div>
        <h1>MES 인터페이스</h1>
        <p>고객사 MES 필드명이 달라도 괜찮습니다 — 필드 매핑과 변환 규칙을 직접 설정합니다.</p>
      </div>
      <BaseInput v-model="keyword" type="search" placeholder="지표명, MES 필드, 표준 필드, 변환 규칙 검색" />
    </header>

    <section class="admin-mes-view__overview">
      <div class="surface-card">
        <span>대상 공장</span>
        <strong>{{ currentFabName }}</strong>
      </div>
      <div class="surface-card">
        <span>활성 매핑</span>
        <strong>{{ activeCount }} / {{ mappings.length }}</strong>
      </div>
      <div class="surface-card">
        <span>필수 필드</span>
        <strong>{{ requiredCount }}</strong>
      </div>
      <div class="surface-card">
        <span>이름 변환</span>
        <strong>{{ renamedCount }}</strong>
        <small>고객사 명칭 → 표준 명칭</small>
      </div>
    </section>

    <section class="admin-mes-view__bridge surface-card">
      <div class="admin-mes-view__bridge-flow">
        <div class="admin-mes-view__bridge-node">
          <strong>고객사 MES</strong>
          <span>{{ currentFabName }}</span>
        </div>
        <div class="admin-mes-view__bridge-pipe">
          <span>{{ activeCount }}개 필드 연결</span>
        </div>
        <div class="admin-mes-view__bridge-node admin-mes-view__bridge-node--std">
          <strong>fabBear 표준</strong>
          <span>병목 · 대응 · 리포트</span>
        </div>
      </div>
      <BaseBadge :variant="validationStatus.state === 'success' ? 'success' : 'warning'">
        {{ validationStatus.state === 'success' ? '연결 정상' : '검증 필요' }}
      </BaseBadge>
    </section>

    <section class="admin-mes-view__card surface-card">
      <h2>필드 매핑</h2>

      <p v-if="isLoading" class="admin-mes-view__state">MES 필드 매핑을 불러오는 중입니다.</p>
      <p v-else-if="errorMessage" class="admin-mes-view__state admin-mes-view__state--error">{{ errorMessage }}</p>

      <BaseTable v-else :columns="columns" :rows="filteredMappings.map(toRow)" row-key="id">
        <template #cell-customerMetricName="{ row }">
          <strong>{{ getMapping(row).customerMetricName }}</strong>
        </template>

        <template #cell-externalField="{ row }">
          <code :class="{ 'admin-mes-view__field--identity': isIdentityMapping(getMapping(row)) }">{{
            getMapping(row).externalField
          }}</code>
        </template>

        <template #cell-internalField="{ row }">
          <code class="admin-mes-view__readonly-field">{{ getMapping(row).internalField }}</code>
        </template>

        <template #cell-dataType="{ row }">
          <BaseBadge variant="info">{{ getMapping(row).dataType }}</BaseBadge>
        </template>

        <template #cell-metricScope="{ row }">
          <BaseBadge variant="info">{{ scopeLabel(getMapping(row).metricScope) }}</BaseBadge>
        </template>

        <template #cell-transformRule="{ row }">
          <span
            v-if="isIdentityMapping(getMapping(row))"
            class="admin-mes-view__transform admin-mes-view__transform--identity"
          >
            동일 · 변환 불필요
          </span>
          <span v-else class="admin-mes-view__transform admin-mes-view__transform--mapped">
            {{ transformDisplay(getMapping(row)) }}
          </span>
        </template>

        <template #cell-isRequired="{ row }">
          <BaseBadge :variant="getMapping(row).isRequired ? 'warning' : 'info'">
            {{ getMapping(row).isRequired ? '필수' : '선택' }}
          </BaseBadge>
        </template>

        <template #cell-isActive="{ row }">
          <BaseBadge :variant="getMapping(row).isActive ? 'success' : 'info'">
            {{ getMapping(row).isActive ? '활성' : '비활성' }}
          </BaseBadge>
        </template>

        <template #cell-action="{ row }">
          <BaseButton variant="ghost" size="sm" @click="startEdit(getMapping(row))">수정</BaseButton>
        </template>
      </BaseTable>
    </section>

    <section class="admin-mes-view__links">
      <article class="surface-card">
        <h2>판정 기준 설정</h2>
        <RouterLink class="admin-mes-view__link" to="/admin/thresholds">임계값 관리 →</RouterLink>
      </article>
      <article class="surface-card">
        <h2>수집 상태 확인</h2>
        <RouterLink class="admin-mes-view__link" to="/admin/ingestion">데이터 수집 →</RouterLink>
      </article>
    </section>
  </div>

  <BaseModal :model-value="isEditModalOpen" title="필드 매핑 수정" width="480px" @update:model-value="cancelEdit">
    <div v-if="draft && editingMapping" class="admin-mes-modal">
      <div class="admin-mes-modal__context">
        <span>fabBear 표준 필드</span>
        <code>{{ draft.internalField }}</code>
      </div>

      <div class="admin-mes-modal__fields">
        <label class="admin-mes-modal__field">
          <span>고객사 지표명</span>
          <BaseInput v-model="draft.customerMetricName" placeholder="예: 가동률" />
        </label>

        <label class="admin-mes-modal__field">
          <span>고객사 MES 필드</span>
          <BaseInput v-model="draft.externalField" placeholder="예: UTIL_RATE" />
        </label>

        <div class="admin-mes-modal__row">
          <div class="admin-mes-modal__field">
            <span>타입</span>
            <div class="admin-mes-modal__readonly">{{ draft.dataType }}</div>
          </div>
          <div class="admin-mes-modal__field">
            <span>범위</span>
            <div class="admin-mes-modal__readonly">{{ scopeLabel(draft.metricScope) }}</div>
          </div>
        </div>

        <label class="admin-mes-modal__field">
          <span>변환 규칙</span>
          <BaseInput v-model="draft.transformRule" placeholder="예: 0~100 입력 시 /100" />
        </label>

        <div class="admin-mes-modal__field">
          <span>활성 상태</span>
          <div class="admin-mes-modal__readonly">
            {{ draft.isActive ? '활성' : '비활성' }}
            <small v-if="draft.isRequired">· 필수 필드는 항상 활성</small>
          </div>
        </div>
      </div>

      <div class="admin-mes-modal__footer">
        <BaseButton :disabled="isSaving" @click="saveEdit">{{ isSaving ? '저장 중' : '저장' }}</BaseButton>
        <BaseButton variant="ghost" @click="cancelEdit">취소</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.admin-mes-view {
  display: grid;
  gap: var(--space-4);
}

/* Header */
.admin-mes-view__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: var(--space-4);
  align-items: end;
}

.admin-mes-view__header h1 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}

.admin-mes-view__header p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

/* Overview cards */
.admin-mes-view__overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.admin-mes-view__overview div {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
}

.admin-mes-view__overview span,
.admin-mes-view__overview small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-mes-view__overview strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
}

/* Bridge */
.admin-mes-view__bridge {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
}

.admin-mes-view__bridge-flow {
  flex: 1;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
}

.admin-mes-view__bridge-node {
  display: grid;
  gap: 2px;
}

.admin-mes-view__bridge-node strong {
  color: var(--color-fg-strong);
}

.admin-mes-view__bridge-node span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-mes-view__bridge-node--std strong {
  color: var(--color-action-primary);
}

.admin-mes-view__bridge-pipe {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
}

.admin-mes-view__bridge-pipe::before {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border-default);
}

.admin-mes-view__bridge-pipe::after {
  content: '→';
  color: var(--color-fg-muted);
  font-size: 16px;
  line-height: 1;
  opacity: 0.7;
}

.admin-mes-view__bridge-pipe span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

/* Card sections */
.admin-mes-view__card {
  display: grid;
  gap: var(--space-3);
  align-content: start;
  padding: var(--space-4);
}

.admin-mes-view__card h2 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.admin-mes-view__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.admin-mes-view__state--error {
  color: var(--color-status-danger);
}

/* Field code display */
code {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.admin-mes-view__readonly-field {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: 0 var(--space-2);
  white-space: nowrap;
}

/* 동일명(변환 불필요) 외부 필드는 흐리게 — 이름이 다른(정규화되는) 행을 상대적으로 부각 */
.admin-mes-view__field--identity {
  color: var(--color-fg-muted);
  opacity: 0.75;
}

.admin-mes-view__transform {
  font-size: var(--font-size-sm);
}

.admin-mes-view__transform--identity {
  color: var(--color-fg-muted);
}

.admin-mes-view__transform--mapped {
  color: var(--color-action-primary);
  font-weight: var(--font-weight-semibold);
}

/* Links */
.admin-mes-view__links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.admin-mes-view__links article {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
}

.admin-mes-view__links h2 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.admin-mes-view__link {
  width: fit-content;
  color: var(--color-action-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.admin-mes-view__link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Modal */
.admin-mes-modal {
  display: grid;
  gap: var(--space-4);
}

.admin-mes-modal__context {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.admin-mes-modal__context span {
  color: var(--color-fg-muted);
  flex-shrink: 0;
}

.admin-mes-modal__context code {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.admin-mes-modal__fields {
  display: grid;
  gap: var(--space-3);
}

.admin-mes-modal__field {
  display: grid;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
}

.admin-mes-modal__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.admin-mes-modal__readonly {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: 0 var(--space-3);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.admin-mes-modal__readonly small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-mes-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
}

/* Responsive */
@media (max-width: 1100px) {
  .admin-mes-view__overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .admin-mes-view__header,
  .admin-mes-view__links {
    grid-template-columns: 1fr;
  }

  .admin-mes-view__bridge {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }

  .admin-mes-view__bridge-flow {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .admin-mes-view__bridge-pipe::before {
    display: none;
  }

  .admin-mes-view__bridge-pipe::after {
    content: '↓';
  }

  .admin-mes-modal__row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .admin-mes-view__overview {
    grid-template-columns: 1fr;
  }
}
</style>
