export interface Fab3dPoint {
  x: number;
  y: number;
  z: number;
}

export interface BayCfg {
  bayId: string;
  areaCode: string;
  label: string;
  tgFilter?: (tgName: string) => boolean;
  slice: [number, number];
  cx: number;
  aisleZ: number;
  aisleW: number;
  cols: number;
  colSp: number;
  sc: number;
}

export const FLOOR_W = 190;
export const FLOOR_D = 116;
export const OHT_Y = 8.2;

export const BAY_IDS = {
  LITHO: 'litho-bay',
  PROCESS: 'process-bay',
  THERMAL: 'thermal-bay',
  CHEMICAL: 'chemical-bay',
  BUFFER: 'buffer-bay',
} as const;

// 공정 band별 바닥 틴트 — 씬(THREE hex)과 범례(CSS)가 단일 출처를 공유한다.
// 채도를 낮게 유지해 장비(라이트=흰색, 다크=베이스)가 잘 구분되도록 한다.
export interface ZoneBand {
  type: string;
  label: string;
  light: number;
  dark: number;
}
export const ZONE_BANDS: ZoneBand[] = [
  { type: 'photo', label: 'Bay 1 · Litho / 계측', light: 0xd9d3e2, dark: 0x10183a },
  { type: 'process', label: 'Bay 2 · 식각 / 박막', light: 0xd2ddd0, dark: 0x111c35 },
  { type: 'thermal', label: 'Bay 3 · 열처리 / Implant', light: 0xe4dac3, dark: 0x112436 },
  { type: 'chemical', label: 'Bay 4 · Wet / CMP', light: 0xd0dbe4, dark: 0x0f1a30 },
];

/** 0xRRGGBB number → '#rrggbb' CSS 문자열 */
export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

export const AREA_TO_BAY: Record<string, string> = {
  LITHO: BAY_IDS.LITHO,
  LITHO_MET: BAY_IDS.LITHO,
  DRY_ETCH: BAY_IDS.PROCESS,
  DIELECTRIC: BAY_IDS.PROCESS,
  DEF_MET: BAY_IDS.PROCESS,
  DIFFUSION: BAY_IDS.THERMAL,
  IMPLANT: BAY_IDS.THERMAL,
  WET_ETCH: BAY_IDS.CHEMICAL,
  PLANAR: BAY_IDS.CHEMICAL,
  OTHER: BAY_IDS.BUFFER,
  DELAY_32: BAY_IDS.BUFFER,
};

export const MAIN_SPINE_RUNS = [
  { z: -28, xLen: 178, cx: 0, label: 'Main Interbay Spine' },
  { z: 28, xLen: 178, cx: 0, label: 'Secondary Interbay Spine' },
];

export const BAY_RAIL_RUNS = [
  { bayId: BAY_IDS.LITHO, z: -43, xLen: 146, cx: -6, label: 'Litho / Metrology Bay Loop' },
  { bayId: BAY_IDS.PROCESS, z: -13, xLen: 162, cx: 0, label: 'Process Bay Loop' },
  { bayId: BAY_IDS.THERMAL, z: 13, xLen: 124, cx: -8, label: 'Thermal / Implant Bay Loop' },
  { bayId: BAY_IDS.CHEMICAL, z: 43, xLen: 142, cx: 4, label: 'Chemical / CMP Bay Loop' },
];

export const OHT_CONNECTORS = [
  { x: 0, z1: -43, z2: -28 },
  { x: 0, z1: -13, z2: -28 },
  { x: 0, z1: 13, z2: 28 },
  { x: 0, z1: 43, z2: 28 },
  { x: -58, z1: -43, z2: -28 },
  { x: 58, z1: -13, z2: -28 },
  { x: -58, z1: 13, z2: 28 },
  { x: 58, z1: 43, z2: 28 },
];

export const SERVICE_CHASE_RUNS = [
  { z: -54, label: 'North Service Chase' },
  { z: 0, label: 'Center Service Chase' },
  { z: 54, label: 'South Service Chase' },
];

export const STOCKER_NODES = [
  { label: 'STK-01', x: 0, z: -35.5, location: 'Litho/계측 Bay 입구', route: 'Litho Bay Loop ↔ Main Spine' },
  { label: 'STK-02', x: 0, z: -20.5, location: '식각/박막 Bay 입구', route: 'Process Bay Loop ↔ Main Spine' },
  { label: 'STK-03', x: 0, z: 20.5, location: '열처리/Implant Bay 입구', route: 'Thermal Bay Loop ↔ Secondary Spine' },
  { label: 'STK-04', x: 0, z: 35.5, location: 'Wet/CMP Bay 입구', route: 'Chemical Bay Loop ↔ Secondary Spine' },
];

export const BAY_TO_STOCKER: Record<string, string> = {
  [BAY_IDS.LITHO]: 'STK-01',
  [BAY_IDS.PROCESS]: 'STK-02',
  [BAY_IDS.THERMAL]: 'STK-03',
  [BAY_IDS.CHEMICAL]: 'STK-04',
  [BAY_IDS.BUFFER]: 'STK-02',
};

export const STOCKER_AREA_CODES: Record<string, string[]> = {
  'STK-01': ['LITHO', 'LITHO_MET'],
  'STK-02': ['DRY_ETCH', 'DIELECTRIC', 'DEF_MET'],
  'STK-03': ['DIFFUSION', 'IMPLANT'],
  'STK-04': ['WET_ETCH', 'PLANAR'],
};

export const FLOOR_SERVICE_RUNS: Array<{ name: string; route: string; path: [Fab3dPoint, Fab3dPoint] }> = [
  {
    name: 'AMR-01',
    route: '북측 Service Chase 정비 동선',
    path: [
      { x: -86, y: 0.28, z: -54 },
      { x: 86, y: 0.28, z: -54 },
    ],
  },
  {
    name: 'AMR-02',
    route: '중앙 Service Chase 점검 동선',
    path: [
      { x: -86, y: 0.28, z: 0 },
      { x: 86, y: 0.28, z: 0 },
    ],
  },
  {
    name: 'AMR-03',
    route: '남측 Service Chase 정비 동선',
    path: [
      { x: -86, y: 0.28, z: 54 },
      { x: 86, y: 0.28, z: 54 },
    ],
  },
  {
    name: 'AMR-04',
    route: 'Main Spine 북측 가장자리 보조 동선',
    path: [
      { x: -86, y: 0.28, z: -32 },
      { x: 86, y: 0.28, z: -32 },
    ],
  },
  {
    name: 'AMR-05',
    route: 'Main Spine 남측 가장자리 보조 동선',
    path: [
      { x: -86, y: 0.28, z: -24 },
      { x: 86, y: 0.28, z: -24 },
    ],
  },
  {
    name: 'AMR-06',
    route: 'Secondary Spine 가장자리 보조 동선',
    path: [
      { x: -86, y: 0.28, z: 24 },
      { x: 86, y: 0.28, z: 24 },
    ],
  },
  {
    name: 'AMR-07',
    route: '서측 외곽 정비 통로',
    path: [
      { x: -88, y: 0.28, z: -55 },
      { x: -88, y: 0.28, z: 55 },
    ],
  },
  {
    name: 'AMR-08',
    route: '동측 외곽 정비 통로',
    path: [
      { x: 88, y: 0.28, z: -55 },
      { x: 88, y: 0.28, z: 55 },
    ],
  },
  {
    name: 'AMR-09',
    route: 'Stocker 정비 접근 동선',
    path: [
      { x: -8, y: 0.28, z: -35 },
      { x: -8, y: 0.28, z: 36 },
    ],
  },
];

export const BAYS: BayCfg[] = [
  {
    bayId: AREA_TO_BAY.LITHO,
    areaCode: 'LITHO',
    label: 'Litho Scanner',
    tgFilter: (c) => c.startsWith('Litho_FE_') || c.startsWith('Litho_BE_'),
    slice: [0, 7],
    cx: -38,
    aisleZ: -43,
    aisleW: 3.8,
    cols: 4,
    colSp: 7,
    sc: 1.15,
  },
  {
    bayId: AREA_TO_BAY.LITHO,
    areaCode: 'LITHO',
    label: 'Litho Track',
    tgFilter: (c) => c.startsWith('LithoTrack_'),
    slice: [0, 4],
    cx: 18,
    aisleZ: -43,
    aisleW: 3.8,
    cols: 2,
    colSp: 7,
    sc: 1.05,
  },
  {
    bayId: AREA_TO_BAY.LITHO,
    areaCode: 'LITHO',
    label: 'Overlay REG',
    tgFilter: (c) => c.startsWith('Litho_REG_'),
    slice: [0, 2],
    cx: 38,
    aisleZ: -43,
    aisleW: 3.8,
    cols: 1,
    colSp: 7,
    sc: 1.0,
  },
  {
    bayId: AREA_TO_BAY.LITHO_MET,
    areaCode: 'LITHO_MET',
    label: 'CD / Litho Met',
    slice: [0, 2],
    cx: 55,
    aisleZ: -43,
    aisleW: 3.8,
    cols: 1,
    colSp: 7,
    sc: 1.0,
  },
  {
    bayId: AREA_TO_BAY.DRY_ETCH,
    areaCode: 'DRY_ETCH',
    label: 'Dry Etch FE',
    tgFilter: (c) => c.startsWith('DE_FE_'),
    slice: [0, 12],
    cx: -64,
    aisleZ: -13,
    aisleW: 3.8,
    cols: 6,
    colSp: 6.8,
    sc: 1.08,
  },
  {
    bayId: AREA_TO_BAY.DRY_ETCH,
    areaCode: 'DRY_ETCH',
    label: 'Dry Etch BE',
    tgFilter: (c) => c.startsWith('DE_BE_'),
    slice: [0, 9],
    cx: -23,
    aisleZ: -13,
    aisleW: 3.8,
    cols: 5,
    colSp: 6.6,
    sc: 1.06,
  },
  {
    bayId: AREA_TO_BAY.DIELECTRIC,
    areaCode: 'DIELECTRIC',
    label: 'Thin Film',
    tgFilter: (c) => c.startsWith('TF_FE') || c.startsWith('TF_BE'),
    slice: [0, 11],
    cx: 20,
    aisleZ: -13,
    aisleW: 3.8,
    cols: 6,
    colSp: 6.6,
    sc: 0.98,
  },
  {
    bayId: AREA_TO_BAY.DEF_MET,
    areaCode: 'DEF_MET',
    label: 'Metal Dep',
    slice: [0, 9],
    cx: 67,
    aisleZ: -13,
    aisleW: 3.8,
    cols: 5,
    colSp: 6.2,
    sc: 0.95,
  },
  {
    bayId: AREA_TO_BAY.DIFFUSION,
    areaCode: 'DIFFUSION',
    label: 'Diffusion',
    tgFilter: (c) => c.startsWith('Diffusion_'),
    slice: [0, 10],
    cx: -42,
    aisleZ: 13,
    aisleW: 3.8,
    cols: 5,
    colSp: 7,
    sc: 1.05,
  },
  {
    bayId: AREA_TO_BAY.DIFFUSION,
    areaCode: 'DIFFUSION',
    label: 'EPI',
    tgFilter: (c) => c.startsWith('EPI_'),
    slice: [0, 2],
    cx: -10,
    aisleZ: 13,
    aisleW: 3.8,
    cols: 1,
    colSp: 7,
    sc: 1.05,
  },
  {
    bayId: AREA_TO_BAY.IMPLANT,
    areaCode: 'IMPLANT',
    label: 'Implant',
    slice: [0, 7],
    cx: 32,
    aisleZ: 13,
    aisleW: 3.8,
    cols: 4,
    colSp: 7,
    sc: 1.05,
  },
  {
    bayId: AREA_TO_BAY.OTHER,
    areaCode: 'OTHER',
    label: 'Delay Buffer',
    tgFilter: (c) => c.startsWith('Delay_'),
    slice: [0, 1],
    cx: -78,
    aisleZ: 0,
    aisleW: 3.4,
    cols: 1,
    colSp: 6,
    sc: 0.9,
  },
  {
    bayId: AREA_TO_BAY.WET_ETCH,
    areaCode: 'WET_ETCH',
    label: 'Wet Etch',
    slice: [0, 14],
    cx: -40,
    aisleZ: 43,
    aisleW: 3.8,
    cols: 7,
    colSp: 7,
    sc: 1.0,
  },
  {
    bayId: AREA_TO_BAY.DIELECTRIC,
    areaCode: 'DIELECTRIC',
    label: 'Dielectric',
    tgFilter: (c) => c.startsWith('Dielectric_'),
    slice: [0, 10],
    cx: 25,
    aisleZ: 43,
    aisleW: 3.8,
    cols: 5,
    colSp: 7,
    sc: 1.0,
  },
  {
    bayId: AREA_TO_BAY.PLANAR,
    areaCode: 'PLANAR',
    label: 'CMP',
    slice: [0, 6],
    cx: 62,
    aisleZ: 43,
    aisleW: 3.8,
    cols: 3,
    colSp: 7,
    sc: 1.0,
  },
];
