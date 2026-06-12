import type { Fab3dArea, Fab3dRisk, Fab3dToolGroup } from '@/types/fab3d';

function risk(u: number): Fab3dRisk {
  if (u >= 0.9) return 'CRITICAL';
  if (u >= 0.85) return 'WARNING';
  return 'NORMAL';
}
function tg(
  id: string,
  name: string,
  area: string,
  u: number,
  wip: number,
  waiting: number,
  toolCnt: number
): Fab3dToolGroup {
  return {
    tgId: id,
    tgName: name,
    areaCode: area,
    risk: risk(u),
    utilizationRate: u,
    wipCount: wip,
    waitingLots: waiting,
    bottleneckProb: Math.min(0.99, u * 0.96 + 0.05),
    toolCount: toolCnt,
  };
}

const DE = 'DRY_ETCH',
  LT = 'LITHO',
  DF = 'DIFFUSION',
  IM = 'IMPLANT';
const PL = 'PLANAR',
  DI = 'DIELECTRIC',
  LM = 'LITHO_MET',
  DM = 'DEF_MET',
  WE = 'WET_ETCH',
  OT = 'OTHER';

export const MOCK_FAB3D_AREAS: Fab3dArea[] = [
  {
    areaId: 'area-de',
    areaCode: DE,
    areaName: 'Dry Etch',
    order: 1,
    toolGroups: [
      // DE_FE (12개) — 전공정 식각
      tg('de-fe-1', 'DE_FE_1', DE, 0.92, 420, 88, 6),
      tg('de-fe-51', 'DE_FE_51', DE, 0.884, 362, 64, 6),
      tg('de-fe-53', 'DE_FE_53', DE, 0.78, 248, 28, 5),
      tg('de-fe-54', 'DE_FE_54', DE, 0.76, 224, 22, 5),
      tg('de-fe-56', 'DE_FE_56', DE, 0.91, 408, 82, 6),
      tg('de-fe-58', 'DE_FE_58', DE, 0.83, 290, 38, 5),
      tg('de-fe-59', 'DE_FE_59', DE, 0.72, 198, 18, 5),
      tg('de-fe-62', 'DE_FE_62', DE, 0.862, 320, 52, 6),
      tg('de-fe-70', 'DE_FE_70', DE, 0.68, 174, 14, 5),
      tg('de-fe-71', 'DE_FE_71', DE, 0.74, 210, 20, 5),
      tg('de-fe-72', 'DE_FE_72', DE, 0.82, 280, 34, 5),
      tg('de-fe-86', 'DE_FE_86', DE, 0.942, 464, 96, 6),
      // DE_BE (9개) — 후공정 식각
      tg('de-be-11', 'DE_BE_11', DE, 0.86, 318, 50, 6),
      tg('de-be-12', 'DE_BE_12', DE, 0.72, 198, 18, 5),
      tg('de-be-13', 'DE_BE_13', DE, 0.924, 428, 90, 6),
      tg('de-be-48', 'DE_BE_48', DE, 0.74, 212, 20, 5),
      tg('de-be-50', 'DE_BE_50', DE, 0.832, 294, 40, 5),
      tg('de-be-65', 'DE_BE_65', DE, 0.78, 250, 28, 5),
      tg('de-be-66', 'DE_BE_66', DE, 0.68, 172, 14, 5),
      tg('de-be-67', 'DE_BE_67', DE, 0.752, 218, 22, 5),
      tg('de-be-69', 'DE_BE_69', DE, 0.892, 364, 66, 6),
    ],
  },
  {
    areaId: 'area-lt',
    areaCode: LT,
    areaName: 'Lithography',
    order: 2,
    toolGroups: [
      // Litho 스캐너 FE (4개) — ASML NXT/NXE
      tg('lt-fe-35', 'Litho_FE_35', LT, 0.882, 348, 60, 4),
      tg('lt-fe-92', 'Litho_FE_92', LT, 0.762, 224, 22, 3),
      tg('lt-fe-98', 'Litho_FE_98', LT, 0.912, 410, 84, 4),
      tg('lt-fe-111', 'Litho_FE_111', LT, 0.72, 194, 18, 3),
      // Litho 스캐너 BE (3개)
      tg('lt-be-93', 'Litho_BE_93', LT, 0.842, 298, 42, 4),
      tg('lt-be-99', 'Litho_BE_99', LT, 0.934, 444, 92, 4),
      tg('lt-be-110', 'Litho_BE_110', LT, 0.762, 228, 24, 3),
      // LithoTrack (4개) — TEL ACT 코터/디벨로퍼
      tg('lt-tr-95', 'LithoTrack_FE_95', LT, 0.862, 322, 52, 4),
      tg('lt-tr-96', 'LithoTrack_FE_96', LT, 0.742, 210, 20, 3),
      tg('lt-tr-115', 'LithoTrack_FE_115', LT, 0.824, 282, 36, 3),
      tg('lt-tr-117', 'LithoTrack_BE_117', LT, 0.952, 472, 98, 4),
      // Litho REG (2개) — KLA 오버레이 계측
      tg('lt-rg-64', 'Litho_REG_FE_64', LT, 0.622, 172, 10, 2),
      tg('lt-rg-63', 'Litho_REG_BE_63', LT, 0.584, 152, 8, 2),
    ],
  },
  {
    areaId: 'area-lm',
    areaCode: LM,
    areaName: 'Litho Met',
    order: 3,
    toolGroups: [
      tg('lm-fe-19', 'LithoMet_FE_19', LM, 0.642, 182, 12, 2),
      tg('lm-be-18', 'LithoMet_BE_18', LM, 0.604, 162, 10, 2),
    ],
  },
  {
    areaId: 'area-df',
    areaCode: DF,
    areaName: 'Diffusion',
    order: 4,
    toolGroups: [
      // Diffusion 수직 퍼니스 (10개)
      tg('df-fe-44', 'Diffusion_FE_44', DF, 0.782, 244, 26, 5),
      tg('df-fe-94', 'Diffusion_FE_94', DF, 0.842, 298, 42, 5),
      tg('df-fe-100', 'Diffusion_FE_100', DF, 0.762, 228, 24, 5),
      tg('df-fe-101', 'Diffusion_FE_101', DF, 0.822, 280, 36, 5),
      tg('df-fe-120', 'Diffusion_FE_120', DF, 0.902, 394, 78, 5),
      tg('df-fe-122', 'Diffusion_FE_122', DF, 0.742, 212, 20, 5),
      tg('df-fe-125', 'Diffusion_FE_125', DF, 0.782, 248, 28, 5),
      tg('df-fe-126', 'Diffusion_FE_126', DF, 0.864, 324, 54, 5),
      tg('df-fe-127', 'Diffusion_FE_127', DF, 0.724, 198, 18, 5),
      tg('df-be-123', 'Diffusion_BE_123', DF, 0.804, 264, 32, 5),
      // EPI 에피택시 반응로 (2개)
      tg('epi-36', 'EPI_36', DF, 0.722, 196, 18, 4),
      tg('epi-38', 'EPI_38', DF, 0.782, 248, 28, 4),
    ],
  },
  {
    areaId: 'area-im',
    areaCode: IM,
    areaName: 'Implant',
    order: 5,
    toolGroups: [
      tg('im-74', 'Implant_74', IM, 0.882, 344, 58, 3),
      tg('im-88', 'Implant_88', IM, 0.762, 224, 22, 3),
      tg('im-90', 'Implant_90', IM, 0.922, 424, 88, 3),
      tg('im-91', 'Implant_91', IM, 0.742, 210, 20, 3),
      tg('im-119', 'Implant_119', IM, 0.782, 248, 28, 3),
      tg('im-128', 'Implant_128', IM, 0.822, 282, 36, 3),
      tg('im-132', 'Implant_132', IM, 0.702, 186, 16, 3),
    ],
  },
  {
    areaId: 'area-dm',
    areaCode: DM,
    areaName: 'Metal Dep',
    order: 6,
    toolGroups: [
      // DefMet PVD 스퍼터링 (7개)
      tg('dm-fe-10', 'DefMet_FE_10', DM, 0.882, 348, 62, 5),
      tg('dm-fe-34', 'DefMet_FE_34', DM, 0.762, 228, 24, 5),
      tg('dm-fe-43', 'DefMet_FE_43', DM, 0.844, 302, 44, 5),
      tg('dm-fe-106', 'DefMet_FE_106', DM, 0.722, 194, 18, 5),
      tg('dm-be-33', 'DefMet_BE_33', DM, 0.924, 426, 90, 5),
      tg('dm-be-42', 'DefMet_BE_42', DM, 0.762, 228, 24, 5),
      tg('dm-fe-118', 'DefMet_FE_118', DM, 0.804, 264, 32, 5),
      // TF_Met 막두께 계측 (2개)
      tg('tf-m-45', 'TF_Met_FE_45', DM, 0.542, 144, 8, 2),
      tg('tf-m-61', 'TF_Met_FE_61', DM, 0.562, 152, 8, 2),
    ],
  },
  {
    areaId: 'area-di',
    areaCode: DI,
    areaName: 'Dielectric',
    order: 7,
    toolGroups: [
      // Dielectric CVD (10개)
      tg('di-fe-29', 'Dielectric_FE_29', DI, 0.782, 248, 28, 5),
      tg('di-fe-30', 'Dielectric_FE_30', DI, 0.844, 302, 44, 5),
      tg('di-fe-31', 'Dielectric_FE_31', DI, 0.762, 228, 24, 5),
      tg('di-fe-112', 'Dielectric_FE_112', DI, 0.904, 396, 80, 5),
      tg('di-fe-130', 'Dielectric_FE_130', DI, 0.722, 196, 18, 5),
      tg('di-be-20', 'Dielectric_BE_20', DI, 0.864, 324, 54, 4),
      tg('di-be-21', 'Dielectric_BE_21', DI, 0.742, 212, 20, 4),
      tg('di-be-27', 'Dielectric_BE_27', DI, 0.824, 282, 36, 4),
      tg('di-be-28', 'Dielectric_BE_28', DI, 0.762, 230, 24, 4),
      tg('di-be-60', 'Dielectric_BE_60', DI, 0.882, 348, 62, 4),
      // TF 박막 CVD/ALD (11개)
      tg('tf-fe-3', 'TF_FE_3', DI, 0.782, 248, 28, 4),
      tg('tf-fe-5', 'TF_FE_5', DI, 0.844, 302, 44, 4),
      tg('tf-fe-103', 'TF_FE_103', DI, 0.762, 228, 24, 4),
      tg('tf-fe-104', 'TF_FE_104', DI, 0.882, 348, 62, 4),
      tg('tf-fe-113', 'TF_FE_113', DI, 0.742, 212, 20, 4),
      tg('tf-fe-131', 'TF_FE_131', DI, 0.824, 282, 36, 4),
      tg('tf-be-2', 'TF_BE_2', DI, 0.762, 230, 24, 4),
      tg('tf-be-23', 'TF_BE_23', DI, 0.882, 348, 62, 4),
      tg('tf-be-24', 'TF_BE_24', DI, 0.742, 212, 20, 4),
      tg('tf-be-26', 'TF_BE_26', DI, 0.822, 282, 36, 4),
      tg('tf-be-40', 'TF_BE_40', DI, 0.762, 230, 24, 4),
    ],
  },
  {
    areaId: 'area-pl',
    areaCode: PL,
    areaName: 'CMP / Planar',
    order: 8,
    toolGroups: [
      tg('pl-fe-76', 'Planar_FE_76', PL, 0.782, 246, 26, 5),
      tg('pl-fe-77', 'Planar_FE_77', PL, 0.844, 300, 44, 5),
      tg('pl-fe-78', 'Planar_FE_78', PL, 0.902, 394, 78, 5),
      tg('pl-fe-79', 'Planar_FE_79', PL, 0.722, 196, 18, 5),
      tg('pl-fe-80', 'Planar_FE_80', PL, 0.762, 228, 24, 5),
      tg('pl-be-75', 'Planar_BE_75', PL, 0.882, 346, 60, 5),
    ],
  },
  {
    areaId: 'area-we',
    areaCode: WE,
    areaName: 'Wet Etch',
    order: 9,
    toolGroups: [
      // WE_FE (7개)
      tg('we-fe-8', 'WE_FE_8', WE, 0.782, 248, 28, 4),
      tg('we-fe-41', 'WE_FE_41', WE, 0.844, 302, 44, 4),
      tg('we-fe-47', 'WE_FE_47', WE, 0.764, 230, 24, 4),
      tg('we-fe-83', 'WE_FE_83', WE, 0.902, 394, 78, 4),
      tg('we-fe-84', 'WE_FE_84', WE, 0.762, 228, 24, 4),
      tg('we-fe-85', 'WE_FE_85', WE, 0.844, 302, 44, 4),
      tg('we-fe-108', 'WE_FE_108', WE, 0.722, 196, 18, 4),
      // WE_BE (7개)
      tg('we-be-7', 'WE_BE_7', WE, 0.782, 248, 28, 4),
      tg('we-be-9', 'WE_BE_9', WE, 0.864, 324, 54, 4),
      tg('we-be-14', 'WE_BE_14', WE, 0.742, 212, 20, 4),
      tg('we-be-16', 'WE_BE_16', WE, 0.882, 348, 62, 4),
      tg('we-be-17', 'WE_BE_17', WE, 0.742, 212, 20, 4),
      tg('we-be-81', 'WE_BE_81', WE, 0.762, 230, 24, 4),
      tg('we-be-82', 'WE_BE_82', WE, 0.804, 264, 32, 4),
    ],
  },
  {
    areaId: 'area-buffer',
    areaCode: OT,
    areaName: 'Buffer / Delay',
    order: 10,
    toolGroups: [tg('delay-32', 'Delay_32', OT, 0.0, 0, 0, 1)],
  },
];

export const FAB3D_RISK_LABELS: Record<string, string> = { NORMAL: '정상', WARNING: '주의', CRITICAL: '위험' };
