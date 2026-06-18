import { readonly, ref } from 'vue';

import { shouldUseDemoMockData } from '@/constants/mockMode';

// Module-level singleton state shared across all composable instances
const _demoPhase = ref<0 | 1>(0);
const _demoBncStep = ref(2); // starts with BOTTLENECK_DETECTOR + DIFFUSION_ANALYSIS done

export const demoPhase = readonly(_demoPhase);
export const demoBncStep = readonly(_demoBncStep);

let phaseInitialized = false;
let bncTimer: ReturnType<typeof setInterval> | null = null;

export function initDemoPhase() {
  if (!shouldUseDemoMockData() || phaseInitialized) return;
  phaseInitialized = true;
  _demoPhase.value = 0;
  setTimeout(() => {
    _demoPhase.value = 1;
  }, 10_000);
}

// Animates DE_FE_1 progress: step 2 → 3 → 4 → 5, then stops at HITL_WAITING RUNNING
export function startDemoBncAnimation() {
  if (!shouldUseDemoMockData()) return;
  if (bncTimer !== null || _demoBncStep.value >= 5) return;
  bncTimer = setInterval(() => {
    if (_demoBncStep.value < 5) {
      _demoBncStep.value++;
    } else {
      clearInterval(bncTimer!);
      bncTimer = null;
    }
  }, 3_000);
}

// HITL 승인/반려 또는 리포트 탭 진입 시 수동으로 한 단계 전진
export function advanceDemoBncStep() {
  if (!shouldUseDemoMockData()) return;
  if (bncTimer !== null || _demoBncStep.value >= 7) return;
  _demoBncStep.value++;
}

export function resetDemoBncAnimation() {
  if (bncTimer !== null) {
    clearInterval(bncTimer);
    bncTimer = null;
  }
  _demoBncStep.value = 2;
}
