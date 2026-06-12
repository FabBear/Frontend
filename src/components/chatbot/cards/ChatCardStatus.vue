<script setup lang="ts">
interface StatusOverall {
  util: number;
  wip: number;
  run: number;
  idle: number;
  setup: number;
  down: number;
  avail: number;
}
interface StatusArea {
  name: string;
  wip: number;
  util: number;
  avail: number;
}
defineProps<{ data: { title?: string; overall?: StatusOverall | null; areas: StatusArea[] } }>();
</script>

<template>
  <div class="chat-card-status">
    <span v-if="data.title" class="chat-card-status__title">{{ data.title }}</span>
    <div v-if="data.overall" class="chat-card-status__kpis">
      <div class="chat-card-status__kpi">
        <span>가동률</span><strong>{{ data.overall.util }}%</strong>
      </div>
      <div class="chat-card-status__kpi">
        <span>WIP</span><strong>{{ data.overall.wip }} Lot</strong>
      </div>
      <div class="chat-card-status__kpi">
        <span>가용률</span><strong>{{ data.overall.avail }}%</strong>
      </div>
      <div class="chat-card-status__kpi chat-card-status__kpi--wide">
        <span>설비</span>
        <strong
          >가동 {{ data.overall.run }} · 대기 {{ data.overall.idle }} · 셋업 {{ data.overall.setup }} · 비가동
          {{ data.overall.down }}</strong
        >
      </div>
    </div>
    <table v-if="data.areas?.length" class="chat-card-status__table">
      <thead>
        <tr>
          <th>구역</th>
          <th>WIP</th>
          <th>가동률</th>
          <th>가용률</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="area in data.areas" :key="area.name">
          <td class="chat-card-status__name">{{ area.name }}</td>
          <td class="chat-card-status__num">
            <strong>{{ area.wip }}</strong>
          </td>
          <td class="chat-card-status__num">{{ area.util }}%</td>
          <td class="chat-card-status__num">{{ area.avail }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.chat-card-status {
  display: grid;
  gap: var(--space-2);
}
.chat-card-status__title {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.chat-card-status__kpis {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.chat-card-status__kpi {
  display: grid;
  gap: 1px;
  min-width: 72px;
  padding: 6px 9px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-card);
}
.chat-card-status__kpi--wide {
  flex: 1 1 auto;
}
.chat-card-status__kpi span {
  color: var(--color-fg-muted);
  font-size: 10px;
}
.chat-card-status__kpi strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
}
.chat-card-status__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-xs);
}
.chat-card-status__table th {
  padding: 3px 6px;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
  text-align: right;
}
.chat-card-status__table th:first-child {
  text-align: left;
}
.chat-card-status__table td {
  padding: 3px 6px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.chat-card-status__name {
  color: var(--color-fg-strong);
}
.chat-card-status__num {
  color: var(--color-fg-default);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
