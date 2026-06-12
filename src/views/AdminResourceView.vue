<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { fetchAdminResourceItems, fetchAdminResourceMeta } from '@/services/adminService';

import type { AdminResourceItem, AdminResourceKey, AdminResourceMeta, AdminStatus } from '@/types/admin';

import AdminResourceDetailPanel from '@/components/admin/AdminResourceDetailPanel.vue';
import AdminResourceTable from '@/components/admin/AdminResourceTable.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';

import {
  createAdminItem,
  filterAdminItems,
  filterAdminItemsByStatus,
  getAdminResourceActionLabel,
  normalizeAdminItem,
  removeAdminItem,
  upsertAdminItem,
} from '@/utils/admin';

const route = useRoute();
const items = ref<AdminResourceItem[]>([]);
const meta = ref<AdminResourceMeta | null>(null);
const keyword = ref('');
const statusFilter = ref<AdminStatus | 'ALL'>('ALL');
const selectedItem = ref<AdminResourceItem | null>(null);
const mode = ref<'read' | 'edit' | 'create'>('read');
const isLoading = ref(false);
const loadError = ref<string | null>(null);

const resourceKey = computed(() => route.meta.adminResource as AdminResourceKey);
const keywordFilteredItems = computed(() => filterAdminItems(items.value, keyword.value));
const filteredItems = computed(() => filterAdminItemsByStatus(keywordFilteredItems.value, statusFilter.value));
const selectedId = computed(() => selectedItem.value?.id ?? null);
const attentionCount = computed(
  () => items.value.filter((item) => item.status === 'WARNING' || item.status === 'ERROR').length
);
const latestUpdatedAt = computed(() => {
  const latest = [...items.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return latest?.updatedAt ?? '';
});
const statusFilters: Array<{ value: AdminStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'NORMAL', label: '정상' },
  { value: 'WARNING', label: '주의' },
  { value: 'ERROR', label: '오류' },
  { value: 'DISABLED', label: '비활성' },
];

async function loadResource() {
  isLoading.value = true;
  loadError.value = null;
  try {
    const [nextMeta, nextItems] = await Promise.all([
      fetchAdminResourceMeta(resourceKey.value),
      fetchAdminResourceItems(resourceKey.value),
    ]);
    meta.value = nextMeta;
    items.value = nextItems;
    selectedItem.value = nextItems[0] ?? null;
    mode.value = 'read';
    statusFilter.value = 'ALL';
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '데이터를 불러오는 데 실패했습니다.';
  } finally {
    isLoading.value = false;
  }
}

function selectItem(item: AdminResourceItem) {
  selectedItem.value = item;
  mode.value = 'read';
}

function openCreate() {
  if (!meta.value) return;
  selectedItem.value = createAdminItem(resourceKey.value, meta.value);
  mode.value = 'create';
}

function saveItem(item: AdminResourceItem) {
  const savedItem = normalizeAdminItem(item);
  items.value = upsertAdminItem(items.value, savedItem);
  selectedItem.value = savedItem;
  mode.value = 'read';
}

function deleteItem(item: AdminResourceItem) {
  items.value = removeAdminItem(items.value, item.id);
  selectedItem.value = items.value[0] ?? null;
  mode.value = 'read';
}

function cancelEdit() {
  selectedItem.value = items.value.find((item) => item.id === selectedItem.value?.id) ?? items.value[0] ?? null;
  mode.value = 'read';
}

onMounted(loadResource);
watch(resourceKey, loadResource);
</script>

<template>
  <div v-if="meta" class="admin-resource-view">
    <header class="admin-resource-view__header">
      <div>
        <h1>{{ meta.title }}</h1>
        <p>{{ meta.description }}</p>
      </div>
      <div class="admin-resource-view__header-tools">
        <BaseInput v-model="keyword" type="search" placeholder="항목, 담당, 운영값 검색" />
        <p>{{ getAdminResourceActionLabel(resourceKey) }}</p>
      </div>
    </header>

    <section class="admin-resource-view__summary">
      <div class="surface-card">
        <span>전체</span>
        <strong>{{ items.length }}</strong>
      </div>
      <div class="surface-card">
        <span>검색 결과</span>
        <strong>{{ filteredItems.length }}</strong>
      </div>
      <div class="surface-card">
        <span>주의 필요</span>
        <strong>{{ attentionCount }}</strong>
      </div>
      <div class="surface-card">
        <span>최근 갱신</span>
        <strong>{{ latestUpdatedAt ? latestUpdatedAt.slice(5, 10) : '-' }}</strong>
      </div>
    </section>

    <div class="admin-resource-view__body">
      <section class="admin-resource-view__content surface-card">
        <div class="admin-resource-view__toolbar">
          <div class="admin-resource-view__filters">
            <button
              v-for="filter in statusFilters"
              :key="filter.value"
              class="admin-resource-view__filter"
              :class="{ 'admin-resource-view__filter--active': statusFilter === filter.value }"
              type="button"
              @click="statusFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
          <BaseButton v-if="meta.canCreate" size="sm" @click="openCreate">{{
            meta.createLabel ?? '항목 추가'
          }}</BaseButton>
          <small v-else>운영 데이터 보호를 위해 조회만 가능합니다.</small>
        </div>
        <p v-if="isLoading" class="admin-resource-view__state">관리 데이터를 불러오는 중입니다.</p>
        <p v-else-if="loadError" class="admin-resource-view__state admin-resource-view__state--error">
          {{ loadError }}
          <button type="button" class="admin-resource-view__retry" @click="loadResource">다시 시도</button>
        </p>
        <AdminResourceTable v-else :meta="meta" :items="filteredItems" :selected-id="selectedId" @select="selectItem" />
      </section>

      <AdminResourceDetailPanel
        :meta="meta"
        :item="selectedItem"
        :mode="mode"
        @save="saveItem"
        @delete="deleteItem"
        @cancel="cancelEdit"
        @edit="mode = 'edit'"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-resource-view {
  display: grid;
  gap: var(--space-4);
}

.admin-resource-view__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
  align-items: end;
  gap: var(--space-4);
}

.admin-resource-view__header h1,
.admin-resource-view__header p,
.admin-resource-view__state {
  margin: 0;
}

.admin-resource-view__header-tools {
  display: grid;
  gap: var(--space-2);
}

.admin-resource-view__header h1 {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}

.admin-resource-view__header p,
.admin-resource-view__toolbar,
.admin-resource-view__toolbar small,
.admin-resource-view__state,
.admin-resource-view__summary span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.admin-resource-view__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.admin-resource-view__summary div {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
}

.admin-resource-view__summary strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
}

.admin-resource-view__body {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
  align-items: start;
  gap: var(--space-4);
}

.admin-resource-view__content {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.admin-resource-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.admin-resource-view__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.admin-resource-view__filter {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  padding: 4px 9px;
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.admin-resource-view__filter--active {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.admin-resource-view__state--error {
  color: var(--color-risk-critical);
}

.admin-resource-view__retry {
  border: 0;
  background: transparent;
  color: var(--color-action-primary);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  margin-left: var(--space-2);
  padding: 0;
  text-decoration: underline;
}

@media (max-width: 1100px) {
  .admin-resource-view__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .admin-resource-view__header,
  .admin-resource-view__summary {
    grid-template-columns: 1fr;
  }
}
</style>
