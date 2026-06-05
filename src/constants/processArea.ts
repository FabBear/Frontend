export const PROCESS_AREA_ORDER: string[] = [
  'DRY_ETCH',
  'DEF_MET',
  'DELAY_32',
  'DIELECTRIC',
  'DIFFUSION',
  'IMPLANT',
  'LITHO',
  'LITHO_MET',
  'PLANAR',
  'TF',
  'TF_MET',
  'WET_ETCH',
];

export const SEMICONDUCTOR_PROCESS_ORDER: string[] = [
  'WAFER',
  'OXIDATION',
  'LITHOGRAPHY',
  'ETCH',
  'DEPOSITION',
  'ION_IMPLANT',
  'METALLIZATION',
  'INSPECTION_PACKAGING',
  'BUFFER',
];

export const PROCESS_AREA_NAME_KO: Record<string, string> = {
  WAFER: '웨이퍼 제조',
  OXIDATION: '산화',
  LITHOGRAPHY: '포토',
  ETCH: '식각',
  DEPOSITION: '증착',
  ION_IMPLANT: '이온주입',
  METALLIZATION: '금속배선',
  INSPECTION_PACKAGING: '검사/패키징',
  BUFFER: '버퍼/대기',
  DRY_ETCH: '식각',
  EPI: '에피택시',
  DIFFUSION: '확산/열처리',
  LITHO: '포토',
  LITHO_MET: '금속 리소그래피',
  TF: '박막',
  TF_MET: '금속 박막',
  TF_DIEL: '박막/유전체',
  IMPLANT: '이온주입',
  DELAY_32: '버퍼/대기',
  DELAY: '버퍼/대기',
  DEF_MET: 'DefMet',
  DIELECTRIC: '유전체',
  PLANAR: '평탄화',
  WET_ETCH: '습식 식각',
  OTHER: '기타',
};

export const PROCESS_AREA_DISPLAY_CODE: Record<string, string> = {
  INSPECTION_PACKAGING: 'INSP/PKG',
};

export const PROCESS_AREA_AXIS_LABEL: Record<string, string> = {
  OXIDATION: 'Oxid.',
  LITHOGRAPHY: 'Litho',
  ETCH: 'Etch',
  DEPOSITION: 'Depo',
  ION_IMPLANT: 'Implant',
  METALLIZATION: 'Metal',
  INSPECTION_PACKAGING: 'Inspect',
  BUFFER: 'Buffer',
};

export const MES_SOURCE_TO_SEMICONDUCTOR_PROCESS: Record<string, string> = {
  DRY_ETCH: 'ETCH',
  WET_ETCH: 'ETCH',
  DIFFUSION: 'OXIDATION',
  LITHO: 'LITHOGRAPHY',
  LITHO_MET: 'LITHOGRAPHY',
  TF: 'DEPOSITION',
  DIELECTRIC: 'DEPOSITION',
  EPI: 'DEPOSITION',
  IMPLANT: 'ION_IMPLANT',
  TF_MET: 'METALLIZATION',
  PLANAR: 'METALLIZATION',
  DEF_MET: 'INSPECTION_PACKAGING',
  DELAY_32: 'BUFFER',
};

export function getProcessAreaNameKo(areaName: string): string {
  const normalizedAreaName = areaName.toUpperCase().replaceAll('/', '_');

  return PROCESS_AREA_NAME_KO[normalizedAreaName] ?? areaName;
}

export function getProcessAreaDisplayCode(areaCode: string): string {
  return PROCESS_AREA_DISPLAY_CODE[areaCode] ?? areaCode;
}

export function getProcessAreaAxisLabel(areaCode: string, nameKo: string): string {
  return `${PROCESS_AREA_AXIS_LABEL[areaCode] ?? areaCode}\n${nameKo}`;
}

export function getMesSemiconductorProcessCode(sourceAreaCode: string, toolGroupCode?: string): string {
  if (SEMICONDUCTOR_PROCESS_ORDER.includes(sourceAreaCode)) return sourceAreaCode;
  if (toolGroupCode?.startsWith('EPI_')) return 'ION_IMPLANT';

  return MES_SOURCE_TO_SEMICONDUCTOR_PROCESS[sourceAreaCode] ?? 'BUFFER';
}

export function formatAlertAreaDisplay(areaName: string, tgName?: string): string {
  const normalized = areaName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  const processCode = getMesSemiconductorProcessCode(normalized, tgName);
  return `${getProcessAreaDisplayCode(processCode)} · ${getProcessAreaNameKo(processCode)}`;
}

export function getProcessAreaSortOrder(areaCode: string): number {
  const processIndex = SEMICONDUCTOR_PROCESS_ORDER.indexOf(areaCode);
  if (processIndex !== -1) return processIndex;

  const index = PROCESS_AREA_ORDER.indexOf(areaCode);
  return index === -1 ? 999 : index;
}
