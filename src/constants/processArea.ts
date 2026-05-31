export const PROCESS_AREA_ORDER: string[] = ['EPI', 'Diffusion', 'Implant', 'Litho', 'Etch', 'TF/Diel', 'Delay'];

export const PROCESS_AREA_NAME_KO: Record<string, string> = {
  DRY_ETCH: '식각',
  ETCH: '식각',
  EPI: '에피택시',
  DIFFUSION: '확산/열처리',
  LITHO: '포토',
  LITHO_MET: '금속 리소그래피',
  TF_DIEL: '박막/유전체',
  IMPLANT: '이온주입',
  DELAY: '버퍼/대기',
  DEF_MET: 'DefMet',
  DIELECTRIC: '유전체',
  PLANAR: '평탄화',
  WET_ETCH: '습식 식각',
  OTHER: '기타',
};

export function getProcessAreaNameKo(areaName: string): string {
  const normalizedAreaName = areaName.toUpperCase().replaceAll('/', '_');

  return PROCESS_AREA_NAME_KO[normalizedAreaName] ?? areaName;
}
