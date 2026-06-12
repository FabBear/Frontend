<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { MOCK_FAB3D_AREAS } from '@/constants/mockData/fab3d';
import { ROUTE_NAMES } from '@/constants/routes';

import type { Fab3dToolGroup } from '@/types/fab3d';

import { BAYS, BAY_RAIL_RUNS, FLOOR_D, FLOOR_W, MAIN_SPINE_RUNS } from '@/components/fab3d/fab3dLayoutConfig';

import { formatNumber, formatRatioPercent } from '@/utils/format';

type MapRole = 'anchor' | 'cause' | 'affected' | 'target';

interface MapPoint {
  tg: Fab3dToolGroup;
  x: number;
  z: number;
  left: number;
  top: number;
  bayLabel: string;
  roles: MapRole[];
  primaryRole: MapRole;
}

const props = withDefaults(
  defineProps<{
    title?: string;
    anchorToolGroup?: string | null;
    targetToolGroups?: string[];
    causeToolGroups?: string[];
    affectedToolGroups?: string[];
    selectedToolGroup?: string | null;
  }>(),
  {
    title: '대상 TG 위치',
    anchorToolGroup: null,
    targetToolGroups: () => [],
    causeToolGroups: () => [],
    affectedToolGroups: () => [],
    selectedToolGroup: null,
  }
);

const emit = defineEmits<{
  select: [toolGroupName: string];
}>();

function normalizeTgName(name: string | null | undefined): string {
  return (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function percentX(x: number): number {
  return ((x + FLOOR_W / 2) / FLOOR_W) * 100;
}

function percentZ(z: number): number {
  return ((z + FLOOR_D / 2) / FLOOR_D) * 100;
}

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    const key = normalizeTgName(value);
    if (!value || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function roleLabel(role: MapRole): string {
  switch (role) {
    case 'anchor':
      return '병목 기준';
    case 'cause':
      return '원인 후보';
    case 'affected':
      return '확산 영향';
    case 'target':
      return '조치 대상';
    default:
      return role;
  }
}

const allMapPoints = computed<MapPoint[]>(() => {
  const areaMap = new Map(MOCK_FAB3D_AREAS.map((area) => [area.areaCode, area]));
  const points: MapPoint[] = [];

  for (const bay of BAYS) {
    const area = areaMap.get(bay.areaCode);
    if (!area) continue;

    const allTgs = bay.tgFilter ? area.toolGroups.filter((tg) => bay.tgFilter!(tg.tgName)) : area.toolGroups;
    const tgs = allTgs.slice(bay.slice[0], bay.slice[1]);
    if (!tgs.length) continue;

    if (bay.areaCode === 'OTHER') {
      const tg = tgs[0];
      if (tg) {
        points.push({
          tg,
          x: bay.cx,
          z: bay.aisleZ,
          left: percentX(bay.cx),
          top: percentZ(bay.aisleZ),
          bayLabel: bay.label,
          roles: [],
          primaryRole: 'target',
        });
      }
      continue;
    }

    const placeRow = (rowTgs: Fab3dToolGroup[], rowZ: number) => {
      const count = rowTgs.length;
      rowTgs.forEach((tg, index) => {
        const x = bay.cx - ((count - 1) * bay.colSp) / 2 + index * bay.colSp;
        points.push({
          tg,
          x,
          z: rowZ,
          left: percentX(x),
          top: percentZ(rowZ),
          bayLabel: bay.label,
          roles: [],
          primaryRole: 'target',
        });
      });
    };

    placeRow(tgs.slice(0, bay.cols), bay.aisleZ + bay.aisleW);
    placeRow(tgs.slice(bay.cols), bay.aisleZ - bay.aisleW);
  }

  return points;
});

const pointByName = computed(() => {
  const map = new Map<string, MapPoint>();
  allMapPoints.value.forEach((point) => {
    map.set(normalizeTgName(point.tg.tgName), point);
  });
  return map;
});

const requestedNames = computed(() =>
  unique([props.anchorToolGroup, ...props.causeToolGroups, ...props.affectedToolGroups, ...props.targetToolGroups])
);

const visiblePoints = computed<MapPoint[]>(() => {
  const anchor = normalizeTgName(props.anchorToolGroup);
  const targetSet = new Set(props.targetToolGroups.map(normalizeTgName));
  const causeSet = new Set(props.causeToolGroups.map(normalizeTgName));
  const affectedSet = new Set(props.affectedToolGroups.map(normalizeTgName));

  return requestedNames.value
    .map((name) => pointByName.value.get(normalizeTgName(name)))
    .filter((point): point is MapPoint => !!point)
    .map((point) => {
      const key = normalizeTgName(point.tg.tgName);
      const roles: MapRole[] = [];
      if (key === anchor) roles.push('anchor');
      if (causeSet.has(key)) roles.push('cause');
      if (affectedSet.has(key)) roles.push('affected');
      if (targetSet.has(key)) roles.push('target');

      return {
        ...point,
        roles,
        primaryRole: roles[0] ?? 'target',
      };
    });
});

const missingNames = computed(() =>
  requestedNames.value.filter((name) => !pointByName.value.has(normalizeTgName(name)))
);

const selectedPoint = computed(() => {
  const selectedKey = normalizeTgName(props.selectedToolGroup);
  if (selectedKey) {
    const selected = visiblePoints.value.find((point) => normalizeTgName(point.tg.tgName) === selectedKey);
    if (selected) return selected;
  }

  const anchorKey = normalizeTgName(props.anchorToolGroup);
  return (
    visiblePoints.value.find((point) => normalizeTgName(point.tg.tgName) === anchorKey) ??
    visiblePoints.value[0] ??
    null
  );
});

const fab3dRoute = computed(() => ({
  name: ROUTE_NAMES.fab3d,
  query: selectedPoint.value ? { tg: selectedPoint.value.tg.tgName } : {},
}));

function handleSelect(point: MapPoint) {
  emit('select', point.tg.tgName);
}
</script>

<template>
  <article class="bnc-target-map">
    <div class="bnc-target-map__hd">
      <div>
        <span class="bnc-target-map__eyebrow">FAB 위치</span>
        <h4>{{ title }}</h4>
      </div>
      <RouterLink class="bnc-target-map__link" :to="fab3dRoute">3D에서 보기</RouterLink>
    </div>

    <div class="bnc-target-map__body">
      <div class="bnc-target-map__canvas" aria-label="대상 Tool Group 위치 미니맵">
        <div
          v-for="rail in [...MAIN_SPINE_RUNS, ...BAY_RAIL_RUNS]"
          :key="`${rail.label}-${rail.z}`"
          class="bnc-target-map__rail"
          :style="{
            left: `${percentX(rail.cx - rail.xLen / 2)}%`,
            top: `${percentZ(rail.z)}%`,
            width: `${(rail.xLen / FLOOR_W) * 100}%`,
          }"
        />
        <div
          v-for="bay in BAYS"
          :key="`${bay.areaCode}-${bay.label}`"
          class="bnc-target-map__bay"
          :style="{
            left: `${percentX(bay.cx) - 5.2}%`,
            top: `${percentZ(bay.aisleZ) - 3.8}%`,
          }"
        >
          <span>{{ bay.label }}</span>
        </div>
        <button
          v-for="point in visiblePoints"
          :key="point.tg.tgId"
          type="button"
          class="bnc-target-map__point"
          :class="[
            `bnc-target-map__point--${point.primaryRole}`,
            { 'bnc-target-map__point--selected': selectedPoint?.tg.tgId === point.tg.tgId },
          ]"
          :style="{ left: `${point.left}%`, top: `${point.top}%` }"
          :title="`${point.tg.tgName} · ${point.roles.map(roleLabel).join(', ')}`"
          @click="handleSelect(point)"
        >
          <span>{{ point.roles.includes('anchor') ? '!' : '' }}</span>
        </button>
      </div>

      <aside class="bnc-target-map__detail">
        <template v-if="selectedPoint">
          <strong>{{ selectedPoint.tg.tgName }}</strong>
          <span>{{ selectedPoint.bayLabel }} · {{ selectedPoint.roles.map(roleLabel).join(' · ') }}</span>
          <dl>
            <div>
              <dt>가동률</dt>
              <dd>{{ formatRatioPercent(selectedPoint.tg.utilizationRate) }}</dd>
            </div>
            <div>
              <dt>WIP</dt>
              <dd>{{ formatNumber(selectedPoint.tg.wipCount) }} Lot</dd>
            </div>
            <div>
              <dt>대기 Lot</dt>
              <dd>{{ formatNumber(selectedPoint.tg.waitingLots) }}</dd>
            </div>
          </dl>
        </template>
        <p v-else>표시할 대상 TG가 없습니다.</p>
      </aside>
    </div>

    <div class="bnc-target-map__legend">
      <span class="bnc-target-map__legend-item bnc-target-map__legend-item--anchor">병목 기준</span>
      <span class="bnc-target-map__legend-item bnc-target-map__legend-item--cause">원인 후보</span>
      <span class="bnc-target-map__legend-item bnc-target-map__legend-item--affected">확산 영향</span>
      <span class="bnc-target-map__legend-item bnc-target-map__legend-item--target">조치 대상</span>
    </div>

    <div v-if="visiblePoints.length || missingNames.length" class="bnc-target-map__chips">
      <button
        v-for="point in visiblePoints"
        :key="point.tg.tgId"
        type="button"
        :class="{ 'bnc-target-map__chip--active': selectedPoint?.tg.tgId === point.tg.tgId }"
        @click="handleSelect(point)"
      >
        {{ point.tg.tgName }}
      </button>
      <span v-for="name in missingNames" :key="name" class="bnc-target-map__missing">{{ name }} · 위치 미매핑</span>
    </div>
  </article>
</template>

<style scoped>
.bnc-target-map {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 22%, var(--color-border-subtle));
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-action-primary) 4%, var(--color-bg-card));
}

.bnc-target-map__hd {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-target-map__eyebrow {
  display: block;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.bnc-target-map h4 {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  line-height: 1.35;
}

.bnc-target-map__link {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 38%, var(--color-border-default));
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
}

.bnc-target-map__body {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(180px, 0.7fr);
  gap: var(--space-3);
  align-items: stretch;
  min-width: 0;
}

.bnc-target-map__canvas {
  position: relative;
  min-height: 220px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  background:
    linear-gradient(to right, color-mix(in srgb, var(--color-border-subtle) 26%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--color-border-subtle) 26%, transparent) 1px, transparent 1px),
    var(--color-bg-surface);
  background-size: 8.33% 16.66%;
}

.bnc-target-map__rail {
  position: absolute;
  height: 3px;
  transform: translateY(-50%);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-gold-600, #a15c14) 36%, var(--color-border-default));
  opacity: 0.55;
}

.bnc-target-map__bay {
  position: absolute;
  width: 10.4%;
  min-height: 7.6%;
  transform: translate(-50%, -50%);
  border: 1px solid color-mix(in srgb, var(--color-fg-muted) 16%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-bg-subtle) 62%, transparent);
  color: color-mix(in srgb, var(--color-fg-muted) 72%, transparent);
  font-size: 8px;
  font-weight: var(--font-weight-semibold);
  text-align: center;
  line-height: 1.2;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.bnc-target-map__point {
  position: absolute;
  width: 13px;
  height: 13px;
  transform: translate(-50%, -50%);
  border: 2px solid #fff;
  border-radius: 999px;
  background: #2563eb;
  box-shadow:
    0 0 0 2px #2563eb33,
    0 3px 8px #0f172a2a;
  cursor: pointer;
}

.bnc-target-map__point span {
  position: absolute;
  inset: -1px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 9px;
  font-weight: var(--font-weight-black);
  line-height: 1;
}

.bnc-target-map__point--anchor {
  background: var(--color-status-danger);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--color-status-danger) 20%, transparent),
    0 3px 10px #0f172a30;
}

.bnc-target-map__point--cause {
  background: var(--color-status-warning);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--color-status-warning) 22%, transparent),
    0 3px 10px #0f172a30;
}

.bnc-target-map__point--affected {
  background: #7c3aed;
  box-shadow:
    0 0 0 4px #7c3aed24,
    0 3px 10px #0f172a30;
}

.bnc-target-map__point--target {
  background: #2563eb;
  box-shadow:
    0 0 0 4px #2563eb20,
    0 3px 10px #0f172a30;
}

.bnc-target-map__point--selected {
  width: 17px;
  height: 17px;
  z-index: 2;
  border-color: var(--color-bg-card);
  box-shadow:
    0 0 0 3px var(--color-bg-card),
    0 0 0 6px var(--color-action-primary),
    0 6px 16px #0f172a36;
}

.bnc-target-map__detail {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-target-map__detail strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
}

.bnc-target-map__detail > span,
.bnc-target-map__detail p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.bnc-target-map__detail dl {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.bnc-target-map__detail div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-target-map__detail dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-target-map__detail dd {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-align: right;
}

.bnc-target-map__legend,
.bnc-target-map__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-target-map__legend-item,
.bnc-target-map__chips button,
.bnc-target-map__missing {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  max-width: 100%;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}

.bnc-target-map__chips button {
  cursor: pointer;
}

.bnc-target-map__chip--active {
  border-color: var(--color-action-primary);
  color: var(--color-action-primary);
}

.bnc-target-map__legend-item::before {
  content: '';
  width: 7px;
  height: 7px;
  margin-right: var(--space-1);
  border-radius: 999px;
  background: #2563eb;
}

.bnc-target-map__legend-item--anchor::before {
  background: var(--color-status-danger);
}
.bnc-target-map__legend-item--cause::before {
  background: var(--color-status-warning);
}
.bnc-target-map__legend-item--affected::before {
  background: #7c3aed;
}
.bnc-target-map__legend-item--target::before {
  background: #2563eb;
}

.bnc-target-map__missing {
  border-style: dashed;
}

@media (max-width: 760px) {
  .bnc-target-map__body {
    grid-template-columns: 1fr;
  }

  .bnc-target-map__canvas {
    min-height: 190px;
  }
}
</style>
