export type Fab3dRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Fab3dToolGroup {
  tgId: string;
  tgName: string;
  areaCode: string;
  risk: Fab3dRisk;
  utilizationRate: number;
  wipCount: number;
  waitingLots: number;
  bottleneckProb: number;
  toolCount: number;
  measuredAt?: string;
  // 케이스 스냅샷 모드 전용 (CASE_SNAPSHOT)
  isAnchor?: boolean;
  isAffected?: boolean;
  compositeScore?: number;
  impactScore?: number;
}

export type Fab3dToolStatus = 'RUN' | 'IDLE' | 'SETUP' | 'DOWN';

export interface Fab3dToolDetail {
  toolId: string;
  toolCode: string;
  toolName: string;
  tgId: string;
  tgCode: string;
  status: Fab3dToolStatus;
  utilizationRate: number;
  queueLotCount: number;
  setupRatio: number;
  downRatio: number;
  measuredAt: string;
}

export interface Fab3dArea {
  areaId: string;
  areaCode: string;
  areaName: string;
  order: number;
  toolGroups: Fab3dToolGroup[];
}

export type Fab3dAssetType = 'AMR' | 'OHT' | 'STOCKER' | 'UTILITY';

export interface ToolActivityEvent {
  eventType: string;
  lotId: string | null;
  eventTime: string;
}

export interface ToolActivity {
  toolId: string;
  toolCode: string;
  currentState: 'RUN' | 'IDLE' | 'DOWN' | 'SETUP';
  rawState: string;
  stateChangedAt: string | null;
  stateDurationMin: number | null;
  currentLotId: string | null;
  reason: string | null;
  setupName: string | null;
  queueLotCount: number | null;
  lastDispatchLotId: string | null;
  lastDispatchAt: string | null;
  recentEvents: ToolActivityEvent[];
}

export interface Fab3dVirtualAsset {
  assetId: string;
  assetName: string;
  assetType: Fab3dAssetType;
  status: string;
  location: string;
  route: string;
  load: string;
  eta: string;
  description: string;
}

export interface TgRouteStep {
  routeName: string;
  stepSeq: number;
  totalSteps: number;
  prevTgName: string | null;
  prevAreaCode: string | null;
  prevTgId: string | null;
  nextTgName: string | null;
  nextAreaCode: string | null;
  nextTgId: string | null;
}
