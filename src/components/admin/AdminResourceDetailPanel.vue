<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { AdminResourceItem, AdminResourceMeta, AdminStatus } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';

import { getAdminStatusLabel, getAdminStatusVariant } from '@/utils/admin';
import { formatKoMonthDayTime } from '@/utils/format';

const props = defineProps<{
  item: AdminResourceItem | null;
  meta: AdminResourceMeta;
  mode: 'read' | 'edit' | 'create';
}>();

const emit = defineEmits<{
  edit: [];
  save: [item: AdminResourceItem];
  delete: [item: AdminResourceItem];
  cancel: [];
}>();

const draft = ref<AdminResourceItem | null>(null);
const confirmDelete = ref(false);
const isEditable = computed(() => props.mode === 'create' || props.mode === 'edit');
const panelTitle = computed(() => {
  if (props.mode === 'create') return props.meta.createLabel ?? '항목 추가';
  if (props.item) return props.item.primary || props.meta.title;
  return '항목을 선택하세요';
});

const statusOptions: AdminStatus[] = ['NORMAL', 'WARNING', 'ERROR', 'DISABLED'];

watch(
  () => [props.item, props.mode] as const,
  ([item]) => {
    draft.value = item ? { ...item, metrics: item.metrics.map((metric) => ({ ...metric })) } : null;
    confirmDelete.value = false;
  },
  { immediate: true }
);

function updateMetric(index: number, value: string) {
  if (!draft.value) return;
  draft.value.metrics = draft.value.metrics.map((metric, metricIndex) =>
    metricIndex === index ? { ...metric, value } : metric
  );
}

function save() {
  if (!draft.value) return;
  emit('save', draft.value);
}

function deleteItem() {
  if (!props.item) return;
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  emit('delete', props.item);
}
</script>

<template>
  <aside class="admin-resource-detail surface-card">
    <header class="admin-resource-detail__header">
      <div>
        <h2>{{ panelTitle }}</h2>
        <p v-if="item">{{ meta.primaryLabel }} 세부 정보와 운영값을 확인합니다.</p>
        <p v-else>목록에서 항목을 선택하면 세부 정보가 표시됩니다.</p>
      </div>
      <BaseBadge v-if="item" :variant="getAdminStatusVariant(item.status)">
        {{ getAdminStatusLabel(item.status) }}
      </BaseBadge>
    </header>

    <form v-if="draft && isEditable" class="admin-resource-detail__form" @submit.prevent="save">
      <label>
        <span>{{ meta.primaryLabel }}</span>
        <BaseInput v-model="draft.primary" />
      </label>
      <label>
        <span>{{ meta.secondaryLabel }}</span>
        <BaseInput v-model="draft.secondary" />
      </label>
      <label>
        <span>유형</span>
        <BaseInput v-model="draft.category" />
      </label>
      <label>
        <span>담당</span>
        <BaseInput v-model="draft.owner" />
      </label>
      <label>
        <span>상태</span>
        <select v-model="draft.status" class="input">
          <option v-for="status in statusOptions" :key="status" :value="status">
            {{ getAdminStatusLabel(status) }}
          </option>
        </select>
      </label>
      <label v-for="(metric, index) in draft.metrics" :key="metric.label">
        <span>{{ metric.label }}</span>
        <BaseInput :model-value="metric.value" @update:model-value="updateMetric(index, $event)" />
      </label>
      <footer>
        <BaseButton type="submit" size="sm">저장</BaseButton>
        <BaseButton type="button" variant="ghost" size="sm" @click="$emit('cancel')">취소</BaseButton>
        <BaseButton
          v-if="mode === 'edit' && meta.canDelete"
          type="button"
          variant="ghost"
          size="sm"
          @click="deleteItem"
        >
          {{ confirmDelete ? '삭제 확인' : '삭제' }}
        </BaseButton>
      </footer>
    </form>

    <div v-else-if="item" class="admin-resource-detail__read">
      <dl>
        <div>
          <dt>{{ meta.primaryLabel }}</dt>
          <dd>{{ item.primary }}</dd>
        </div>
        <div>
          <dt>{{ meta.secondaryLabel }}</dt>
          <dd>{{ item.secondary }}</dd>
        </div>
        <div>
          <dt>유형</dt>
          <dd>{{ item.category }}</dd>
        </div>
        <div>
          <dt>담당</dt>
          <dd>{{ item.owner }}</dd>
        </div>
        <div>
          <dt>갱신</dt>
          <dd>{{ formatKoMonthDayTime(item.updatedAt) }}</dd>
        </div>
        <div v-for="metric in item.metrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ metric.value }}</dd>
        </div>
      </dl>
      <footer v-if="meta.canEdit" class="admin-resource-detail__read-actions">
        <BaseButton size="sm" @click="$emit('edit')">편집</BaseButton>
      </footer>
    </div>
  </aside>
</template>

<style scoped>
.admin-resource-detail {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  padding: var(--space-4);
}

.admin-resource-detail__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.admin-resource-detail__header h2,
.admin-resource-detail__header p {
  margin: 0;
}

.admin-resource-detail__header h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.admin-resource-detail__header p,
.admin-resource-detail__form span,
.admin-resource-detail__read dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-resource-detail__form,
.admin-resource-detail__form label,
.admin-resource-detail__read dl {
  display: grid;
  gap: var(--space-3);
}

.admin-resource-detail__form footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.admin-resource-detail__read-actions {
  display: flex;
  justify-content: flex-end;
}

.admin-resource-detail__read dl {
  margin: 0;
}

.admin-resource-detail__read div {
  display: grid;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-2);
}

.admin-resource-detail__read dd {
  margin: 0;
  color: var(--color-fg-strong);
}
</style>
