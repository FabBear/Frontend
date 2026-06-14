import api from '@/services/api';

import type {
  AdminAccessUser,
  AdminDriftAlert,
  AdminMesFieldMapping,
  AdminMlModelVersion,
  AdminThresholdConfig,
  AdminThresholdHistory,
} from '@/types/admin';

interface BackendThresholdConfig {
  configId: string;
  category: AdminThresholdConfig['category'];
  configKey: string;
  configValue: string;
  valueType: AdminThresholdConfig['valueType'];
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface BackendThresholdHistory {
  historyId: string;
  configId: string;
  oldValue: string | null;
  newValue: string;
  changedAt: string;
  changedBy: string;
  changeReason: string | null;
}

function toThresholdConfig(c: BackendThresholdConfig): AdminThresholdConfig {
  return {
    id: c.configId,
    category: c.category,
    configKey: c.configKey,
    configValue: c.configValue,
    valueType: c.valueType,
    description: c.description ?? '',
    updatedBy: c.updatedBy ?? '',
    updatedAt: c.updatedAt ?? '',
  };
}

export async function fetchThresholdConfigs(category?: string): Promise<AdminThresholdConfig[]> {
  const { data } = await api.get<BackendThresholdConfig[]>('/v1/admin/thresholds', {
    params: category ? { category } : {},
  });
  return data.map(toThresholdConfig);
}

/** 단건 설정의 변경 이력. itemName(항목명)은 호출측이 config 맵으로 채운다. */
export async function fetchThresholdHistory(configId: string): Promise<BackendThresholdHistory[]> {
  const { data } = await api.get<BackendThresholdHistory[]>(`/v1/admin/thresholds/${configId}/history`);
  return data;
}

export async function updateThresholdConfigValue(
  configId: string,
  configValue: string,
  changeReason?: string
): Promise<AdminThresholdConfig> {
  const { data } = await api.patch<BackendThresholdConfig>(`/v1/admin/thresholds/${configId}`, {
    configValue,
    changeReason: changeReason ?? null,
  });
  return toThresholdConfig(data);
}

export function mapThresholdHistory(
  rows: BackendThresholdHistory[],
  itemNameByConfigId: Record<string, string>
): AdminThresholdHistory[] {
  return rows.map((h) => ({
    changedAt: h.changedAt,
    itemName: itemNameByConfigId[h.configId] ?? h.configId,
    before: h.oldValue ?? '-',
    after: h.newValue,
    changedBy: h.changedBy,
  }));
}

interface BackendAccessUser {
  loginId: string;
  userName: string;
  roleCode: string;
  roleName: string;
  department: string | null;
  fabName: string | null;
  status: AdminAccessUser['status'];
  isActive: boolean;
  lastLoginAt: string | null;
}

/** 권한 관리 — 현 Fab 사용자/역할 현황(조회 전용). GET /api/v1/admin/access/users */
export async function fetchAdminAccessUsers(): Promise<AdminAccessUser[]> {
  const { data } = await api.get<BackendAccessUser[]>('/v1/admin/access/users');
  return data.map((u) => ({
    id: u.loginId,
    name: u.userName,
    role: u.roleCode as AdminAccessUser['role'],
    department: u.department ?? '',
    fabAccess: u.fabName ?? '',
    lastLogin: u.lastLoginAt ? u.lastLoginAt.replace('T', ' ').slice(0, 16) : '-',
    status: u.status,
    isActive: u.isActive,
  }));
}

interface BackendMesFieldMapping {
  mappingId: string;
  fabId: string;
  metricScope: AdminMesFieldMapping['metricScope'];
  externalField: string;
  internalField: string;
  transformRule: string | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMesFieldMappingPayload {
  externalField: string;
  internalField: string;
  transformRule: string;
}

const INTERNAL_FIELD_META: Record<
  string,
  Pick<AdminMesFieldMapping, 'customerMetricName' | 'dataType' | 'metricScope'>
> = {
  fab_code: { customerMetricName: 'FAB 코드', dataType: 'STRING', metricScope: 'FAB' },
  tool_id: { customerMetricName: '장비 ID', dataType: 'STRING', metricScope: 'TOOL' },
  status: { customerMetricName: '장비 상태', dataType: 'ENUM', metricScope: 'TOOL' },
  utilization_rate: { customerMetricName: '가동률', dataType: 'NUMBER', metricScope: 'TOOL' },
  waiting_lot: { customerMetricName: '대기 Lot', dataType: 'NUMBER', metricScope: 'TOOL_GROUP' },
  queue_lot_count: { customerMetricName: 'Queue Lot', dataType: 'NUMBER', metricScope: 'TOOL_GROUP' },
};

function mapMesFieldMapping(mapping: BackendMesFieldMapping): AdminMesFieldMapping {
  const meta = INTERNAL_FIELD_META[mapping.internalField];
  return {
    id: mapping.mappingId,
    fabId: mapping.fabId,
    customerMetricName: meta?.customerMetricName ?? mapping.internalField,
    externalField: mapping.externalField,
    internalField: mapping.internalField,
    dataType: meta?.dataType ?? 'STRING',
    metricScope: mapping.metricScope ?? meta?.metricScope ?? 'TOOL',
    transformRule: mapping.transformRule ?? '',
    isRequired: mapping.isRequired,
    isActive: mapping.isActive,
    updatedAt: mapping.updatedAt,
  };
}

export async function fetchMesFieldMappings(fabId: string): Promise<AdminMesFieldMapping[]> {
  const { data } = await api.get<BackendMesFieldMapping[]>('/v1/admin/mes/mappings', { params: { fabId } });
  return data.map(mapMesFieldMapping);
}

export async function updateMesFieldMapping(
  mappingId: string,
  payload: UpdateMesFieldMappingPayload
): Promise<AdminMesFieldMapping> {
  const { data } = await api.patch<BackendMesFieldMapping>(`/v1/admin/mes/mappings/${mappingId}`, payload);
  return mapMesFieldMapping(data);
}

export interface AdminMesHealth {
  lastCollectAt: string | null;
  lastStatus: string;
  lastCollectedCount: number | null;
  totalJobs: number;
  successCount: number;
  failedCount: number;
  runningCount: number;
  recentSuccessRate: number;
}

export interface AdminMesCollectJob {
  jobId: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  collectedCount: number;
  errorCount: number;
  retryCount: number;
  lastErrorMsg: string | null;
}

export async function fetchMesHealth(fabId: string): Promise<AdminMesHealth> {
  const { data } = await api.get<AdminMesHealth>('/v1/admin/mes/health', { params: { fabId } });
  return data;
}

export async function fetchMesCollectJobs(fabId: string, limit = 20): Promise<AdminMesCollectJob[]> {
  const { data } = await api.get<AdminMesCollectJob[]>('/v1/admin/mes/collect-jobs', { params: { fabId, limit } });
  return data;
}

export async function fetchMlflowModelVersions(): Promise<AdminMlModelVersion[]> {
  const { data } = await api.get<AdminMlModelVersion[]>('/v1/admin/mlflow/models');
  return data;
}

export async function fetchMlflowDriftAlerts(): Promise<AdminDriftAlert[]> {
  const { data } = await api.get<AdminDriftAlert[]>('/v1/admin/mlflow/drift-alerts');
  return data;
}

export async function promoteMlflowModel(modelVersionId: string): Promise<AdminMlModelVersion> {
  const { data } = await api.patch<AdminMlModelVersion>(`/v1/admin/mlflow/models/${modelVersionId}/promote`);
  return data;
}

export async function requestMlflowRetrain(driftId: string): Promise<AdminDriftAlert> {
  const { data } = await api.patch<AdminDriftAlert>(`/v1/admin/mlflow/drift-alerts/${driftId}/retrain-request`);
  return data;
}
