import type {
  ReleasePlanHotLotsResponse,
  ReleasePlanLot,
  ReleasePlanRange,
  ReleasePlanResponse,
  ReleasePlanSummary,
} from '@/types/productionPlan';

const ANCHOR_MEASURED_AT = '2026-06-14T14:12:00Z';
const SOURCE_RUN_ID = 'release-plan-de-fe-1-20260614-1412';

const UPCOMING_LOTS = [
  lot('LOT-DE-240614-001', 'DRAM_A1', 'ETCH_MAIN', 'HOT', 24, false, 25, 18, 420),
  lot('LOT-DE-240614-002', 'DRAM_A1', 'ETCH_MAIN', 'NORMAL', 8, false, 25, 42, 510),
  lot('LOT-DI-240614-017', 'NAND_B3', 'DIFFUSION_FE', 'NORMAL', 4, false, 25, 66, 680),
  lot('LOT-DE-240614-019', 'DRAM_A2', 'ETCH_REWORK', 'PRIORITY', 12, false, 25, 94, 720),
  lot('LOT-DI-240614-022', 'NAND_B3', 'DIFFUSION_FE', 'NORMAL', 6, false, 25, 126, 840),
  lot('LOT-TF-240614-031', 'DRAM_C1', 'THIN_FILM', 'NORMAL', 5, false, 25, 158, 930),
];

export const MOCK_RELEASE_PLAN_SUMMARY: ReleasePlanSummary = {
  anchorMeasuredAt: ANCHOR_MEASURED_AT,
  anchorTimeStep: 3780,
  plannedLots24h: 186,
  nextReleaseInMin: 18,
  priorityLots24h: 1,
  dueLots7d: 68,
  sourceRunId: SOURCE_RUN_ID,
};

const MOCK_RELEASE_PLAN_24H: ReleasePlanResponse = {
  range: '24h',
  anchorMeasuredAt: ANCHOR_MEASURED_AT,
  anchorTimeStep: 3780,
  sourceRunId: SOURCE_RUN_ID,
  summary: {
    plannedLots: 186,
    plannedWafers: 4650,
    priorityLots: 1,
    superHotLots: 0,
    dueLots: 17,
    nextReleaseInMin: 18,
    avgDueSlackMin: 436,
  },
  releaseBuckets: [
    bucket(0, 0, 240, '0-4h', 28, 1, [
      ['DRAM_A1', 12],
      ['NAND_B3', 9],
      ['DRAM_A2', 7],
    ]),
    bucket(1, 240, 480, '4-8h', 34, 0, [
      ['DRAM_A1', 14],
      ['NAND_B3', 11],
      ['DRAM_C1', 9],
    ]),
    bucket(2, 480, 720, '8-12h', 31, 0, [
      ['NAND_B3', 13],
      ['DRAM_A2', 10],
      ['DRAM_C1', 8],
    ]),
    bucket(3, 720, 960, '12-16h', 29, 0, [
      ['DRAM_A1', 10],
      ['DRAM_C1', 10],
      ['NAND_B3', 9],
    ]),
    bucket(4, 960, 1200, '16-20h', 32, 0, [
      ['DRAM_A2', 12],
      ['NAND_B3', 11],
      ['DRAM_C1', 9],
    ]),
    bucket(5, 1200, 1440, '20-24h', 32, 0, [
      ['DRAM_A1', 13],
      ['DRAM_A2', 10],
      ['NAND_B3', 9],
    ]),
  ],
  productMix: [
    { name: 'DRAM_A1', lots: 61, ratio: 0.328 },
    { name: 'NAND_B3', lots: 62, ratio: 0.333 },
    { name: 'DRAM_A2', lots: 49, ratio: 0.263 },
    { name: 'DRAM_C1', lots: 14, ratio: 0.075 },
  ],
  routeMix: [
    { name: 'ETCH_MAIN', lots: 73, ratio: 0.392 },
    { name: 'DIFFUSION_FE', lots: 56, ratio: 0.301 },
    { name: 'ETCH_REWORK', lots: 31, ratio: 0.167 },
    { name: 'THIN_FILM', lots: 26, ratio: 0.14 },
  ],
  lotTypeMix: [
    { name: 'NORMAL', lots: 167, ratio: 0.898 },
    { name: 'PRIORITY', lots: 18, ratio: 0.097 },
    { name: 'HOT', lots: 1, ratio: 0.005 },
  ],
  productSlack: [
    { productName: 'DRAM_A1', avgSlackMin: 390, lots: 61 },
    { productName: 'NAND_B3', avgSlackMin: 482, lots: 62 },
    { productName: 'DRAM_A2', avgSlackMin: 422, lots: 49 },
    { productName: 'DRAM_C1', avgSlackMin: 536, lots: 14 },
  ],
  upcomingLots: UPCOMING_LOTS,
};

const MOCK_RELEASE_PLAN_7D: ReleasePlanResponse = {
  ...MOCK_RELEASE_PLAN_24H,
  range: '7d',
  summary: {
    plannedLots: 1248,
    plannedWafers: 31200,
    priorityLots: 1,
    superHotLots: 0,
    dueLots: 68,
    nextReleaseInMin: 18,
    avgDueSlackMin: 512,
  },
  releaseBuckets: MOCK_RELEASE_PLAN_24H.releaseBuckets.map((item) => ({
    ...item,
    totalLots: item.totalLots * 6 + 18,
    priorityLots: item.priorityLots,
    products: item.products.map((product) => ({ ...product, lots: product.lots * 6 })),
  })),
};

export function getMockReleasePlan(range: ReleasePlanRange): ReleasePlanResponse {
  if (range === '7d' || range === '30d' || range === 'all') return cloneReleasePlan(MOCK_RELEASE_PLAN_7D, range);
  return cloneReleasePlan(MOCK_RELEASE_PLAN_24H, range);
}

export function getMockReleasePlanHotLots(
  range: ReleasePlanRange,
  page: number,
  size: number
): ReleasePlanHotLotsResponse {
  const lots =
    range === '24h'
      ? UPCOMING_LOTS
      : [
          ...UPCOMING_LOTS,
          ...UPCOMING_LOTS.filter((item) => !isHotLot(item)).map((item, index) => ({
            ...item,
            lotId: `${item.lotId}-${index + 1}`,
            releaseInMin: item.releaseInMin === null ? null : item.releaseInMin + (index + 1) * 180,
          })),
        ];
  const hotLots = lots.filter(isHotLot);
  const start = page * size;
  const pageLots = hotLots.slice(start, start + size);

  return {
    range,
    page,
    size,
    totalElements: hotLots.length,
    totalPages: Math.max(1, Math.ceil(hotLots.length / size)),
    lots: pageLots.map((item) => ({ ...item })),
  };
}

function cloneReleasePlan(plan: ReleasePlanResponse, range: ReleasePlanRange): ReleasePlanResponse {
  return {
    ...plan,
    range,
    summary: { ...plan.summary },
    releaseBuckets: plan.releaseBuckets.map((item) => ({
      ...item,
      products: item.products.map((product) => ({ ...product })),
    })),
    productMix: plan.productMix.map((item) => ({ ...item })),
    routeMix: plan.routeMix.map((item) => ({ ...item })),
    lotTypeMix: plan.lotTypeMix.map((item) => ({ ...item })),
    productSlack: plan.productSlack.map((item) => ({ ...item })),
    upcomingLots: plan.upcomingLots.map((item) => ({ ...item })),
  };
}

function bucket(
  bucketIndex: number,
  fromMin: number,
  toMin: number,
  label: string,
  totalLots: number,
  priorityLots: number,
  products: Array<[string, number]>
) {
  return {
    bucketIndex,
    fromMin,
    toMin,
    label,
    totalLots,
    priorityLots,
    products: products.map(([productName, lots]) => ({ productName, lots })),
  };
}

function lot(
  lotId: string,
  productName: string,
  routeName: string,
  lotType: string,
  priority: number,
  superHot: boolean,
  wafersPerLot: number,
  releaseInMin: number,
  dueInMin: number
) {
  return {
    lotId,
    productName,
    routeName,
    lotType,
    priority,
    superHot,
    wafersPerLot,
    releaseInMin,
    dueInMin,
  };
}

function isHotLot(lotItem: ReleasePlanLot) {
  return lotItem.superHot || (lotItem.priority ?? 0) >= 20 || /hot/i.test(lotItem.lotType ?? '');
}
