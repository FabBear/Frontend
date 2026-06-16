import axios, { type AxiosRequestConfig } from 'axios';

import api from '@/services/api';

import {
  MOCK_ACCESS_USERS,
  MOCK_DRIFT_ALERTS,
  MOCK_LABELING_PREVIEW,
  MOCK_LABELING_RULES,
  MOCK_MES_COLLECT_JOBS,
  MOCK_MES_FIELD_MAPPINGS,
  MOCK_MES_HEALTH,
  MOCK_MLFLOW_RUNTIME_STATUS,
  MOCK_ML_MODEL_VERSIONS,
  MOCK_PROMPT_TEMPLATES,
  MOCK_PROMPT_VERSIONS,
} from '@/constants/mockData/admin';

import type {
  AdminAccessUser,
  AdminDriftAlert,
  AdminLabelingPreview,
  AdminLabelingPreviewRequest,
  AdminLabelingRule,
  AdminMesFieldMapping,
  AdminMlModelVersion,
  AdminMlflowRuntimeStatus,
  AdminPromptTemplate,
  AdminPromptVariablesSchema,
  AdminPromptVersion,
} from '@/types/admin';

const adminDbApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^| )XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function unwrapApiData<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

async function dbGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await adminDbApi.get(url, config);
  return unwrapApiData<T>(data);
}

async function dbPut<T>(url: string, payload: unknown): Promise<T> {
  const token = getCsrfToken();
  const { data } = await adminDbApi.put(url, payload, token ? { headers: { 'X-XSRF-TOKEN': token } } : undefined);
  return unwrapApiData<T>(data);
}

async function dbPatch<T>(url: string, payload: unknown): Promise<T> {
  const token = getCsrfToken();
  const { data } = await adminDbApi.patch(url, payload, token ? { headers: { 'X-XSRF-TOKEN': token } } : undefined);
  return unwrapApiData<T>(data);
}

interface BackendAccessUser {
  userId: string;
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

/** 권한 관리 — 현 Fab 사용자/역할 현황. GET /api/v1/admin/access/users */
export async function fetchAdminAccessUsers(): Promise<AdminAccessUser[]> {
  try {
    const { data } = await api.get<BackendAccessUser[]>('/v1/admin/access/users');
    return data.map(mapAccessUser);
  } catch {
    return MOCK_ACCESS_USERS.map((user) => ({ ...user }));
  }
}

export interface CreateAdminAccessUserPayload {
  loginId: string;
  userName: string;
  department: string;
  roleCode: AdminAccessUser['role'];
  password: string;
  status: AdminAccessUser['status'];
  isActive: boolean;
}

export interface UpdateAdminAccessUserPayload {
  userName: string;
  department: string;
  roleCode: AdminAccessUser['role'];
  status: AdminAccessUser['status'];
  isActive: boolean;
}

function mapAccessUser(u: BackendAccessUser): AdminAccessUser {
  return {
    userId: u.userId,
    id: u.loginId,
    name: u.userName,
    role: u.roleCode as AdminAccessUser['role'],
    department: u.department ?? '',
    fabAccess: u.fabName ?? '',
    lastLogin: u.lastLoginAt ? u.lastLoginAt.replace('T', ' ').slice(0, 16) : '-',
    status: u.status,
    isActive: u.isActive,
  };
}

export async function createAdminAccessUser(payload: CreateAdminAccessUserPayload): Promise<AdminAccessUser> {
  try {
    const { data } = await api.post<BackendAccessUser>('/v1/admin/access/users', payload);
    return mapAccessUser(data);
  } catch {
    return {
      userId: payload.loginId,
      id: payload.loginId,
      name: payload.userName,
      role: payload.roleCode,
      department: payload.department,
      fabAccess: 'SK하이닉스 이천 FAB',
      lastLogin: '-',
      status: payload.status,
      isActive: payload.isActive,
    };
  }
}

export async function updateAdminAccessUser(
  userId: string,
  payload: UpdateAdminAccessUserPayload
): Promise<AdminAccessUser> {
  try {
    const { data } = await api.patch<BackendAccessUser>(`/v1/admin/access/users/${userId}`, payload);
    return mapAccessUser(data);
  } catch {
    const current = MOCK_ACCESS_USERS.find((user) => user.userId === userId || user.id === userId);
    return {
      userId,
      id: current?.id ?? userId,
      name: payload.userName,
      role: payload.roleCode,
      department: payload.department,
      fabAccess: current?.fabAccess ?? 'SK하이닉스 이천 FAB',
      lastLogin: current?.lastLogin ?? '-',
      status: payload.status,
      isActive: payload.isActive,
    };
  }
}

export async function deleteAdminAccessUser(userId: string): Promise<void> {
  try {
    await api.delete(`/v1/admin/access/users/${userId}`);
  } catch {
    return;
  }
}

interface BackendPromptVersion {
  versionId: string;
  versionNo: number;
  versionLabel: string;
  body: string;
  variablesSchema: AdminPromptVariablesSchema | null;
  isActive: boolean;
  changeReason: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface BackendPromptTemplate {
  templateId: string;
  category: string;
  label: string;
  description: string | null;
  activeVersion: string;
  versions: BackendPromptVersion[];
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}

function mapPromptVersion(templateId: string, version: BackendPromptVersion): AdminPromptVersion {
  return {
    id: version.versionId,
    templateId,
    versionNo: version.versionNo,
    version: version.versionLabel,
    body: version.body,
    updatedAt: formatDateTime(version.createdAt),
    updatedBy: version.createdBy ?? '-',
    changeReason: version.changeReason ?? '-',
    status: version.isActive ? 'ACTIVE' : 'PREVIOUS',
    variablesSchema: version.variablesSchema,
  };
}

function mapPromptTemplate(template: BackendPromptTemplate): AdminPromptTemplate {
  const versions = template.versions.map((version) => mapPromptVersion(template.templateId, version));
  const active = versions.find((version) => version.status === 'ACTIVE') ?? versions[0];
  const variables = active?.variablesSchema?.variables ?? [];
  return {
    id: template.templateId,
    category: template.category,
    label: template.label,
    description: template.description ?? '',
    activeVersion: template.activeVersion,
    updatedBy: active?.updatedBy ?? '-',
    updatedAt: active?.updatedAt ?? '-',
    changeReason: active?.changeReason ?? '-',
    body: active?.body ?? '',
    variables,
    variablesSchema: active?.variablesSchema ?? null,
  };
}

export async function fetchAdminPrompts(): Promise<{
  templates: AdminPromptTemplate[];
  versions: AdminPromptVersion[];
}> {
  try {
    const data = await dbGet<BackendPromptTemplate[]>('/v1/admin/prompts');
    return {
      templates: data.map(mapPromptTemplate),
      versions: data.flatMap((template) =>
        template.versions.map((version) => mapPromptVersion(template.templateId, version))
      ),
    };
  } catch {
    return {
      templates: MOCK_PROMPT_TEMPLATES.map((template) => ({
        ...template,
        variables: [...template.variables],
      })),
      versions: MOCK_PROMPT_VERSIONS.map((version) => ({ ...version })),
    };
  }
}

/** 새 프롬프트 활성 버전을 생성한다. category는 tm_prompt_template.template_category 값이다. */
export async function updatePromptVersion(category: string, promptBody: string, changeReason: string): Promise<void> {
  try {
    await dbPut(`/v1/admin/prompts/${category}/versions`, {
      promptBody,
      changeReason: changeReason.trim() || null,
    });
  } catch {
    return;
  }
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
  try {
    const data = await dbGet<BackendMesFieldMapping[]>('/v1/admin/mes/mappings', { params: { fabId } });
    return data.map(mapMesFieldMapping);
  } catch {
    return MOCK_MES_FIELD_MAPPINGS.map((mapping) => ({ ...mapping, fabId }));
  }
}

export async function updateMesFieldMapping(
  mappingId: string,
  payload: UpdateMesFieldMappingPayload
): Promise<AdminMesFieldMapping> {
  try {
    const data = await dbPatch<BackendMesFieldMapping>(`/v1/admin/mes/mappings/${mappingId}`, payload);
    return mapMesFieldMapping(data);
  } catch {
    const current = MOCK_MES_FIELD_MAPPINGS.find((mapping) => mapping.id === mappingId);
    return {
      ...(current ?? MOCK_MES_FIELD_MAPPINGS[0]),
      id: mappingId,
      externalField: payload.externalField,
      internalField: payload.internalField,
      transformRule: payload.transformRule,
      updatedAt: new Date().toISOString(),
    };
  }
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
  try {
    return await dbGet<AdminMesHealth>('/v1/admin/mes/health', { params: { fabId } });
  } catch {
    return { ...MOCK_MES_HEALTH };
  }
}

export async function fetchMesCollectJobs(fabId: string, limit = 20): Promise<AdminMesCollectJob[]> {
  try {
    return await dbGet<AdminMesCollectJob[]>('/v1/admin/mes/collect-jobs', { params: { fabId, limit } });
  } catch {
    return MOCK_MES_COLLECT_JOBS.slice(0, limit).map((job) => ({ ...job }));
  }
}

export async function fetchMlflowModelVersions(): Promise<AdminMlModelVersion[]> {
  try {
    const { data } = await api.get<AdminMlModelVersion[]>('/v1/admin/mlflow/models');
    return data;
  } catch {
    return MOCK_ML_MODEL_VERSIONS.map((model) => ({ ...model, featureList: [...model.featureList] }));
  }
}

export async function fetchMlflowDriftAlerts(): Promise<AdminDriftAlert[]> {
  try {
    const { data } = await api.get<AdminDriftAlert[]>('/v1/admin/mlflow/drift-alerts');
    return data;
  } catch {
    return MOCK_DRIFT_ALERTS.map((alert) => ({ ...alert }));
  }
}

export async function fetchMlflowRuntimeStatus(): Promise<AdminMlflowRuntimeStatus> {
  try {
    const { data } = await api.get<AdminMlflowRuntimeStatus>('/v1/admin/mlflow/runtime-status');
    return data;
  } catch {
    return {
      productionAlias: { ...MOCK_MLFLOW_RUNTIME_STATUS.productionAlias },
      activeDbModel: MOCK_MLFLOW_RUNTIME_STATUS.activeDbModel
        ? {
            ...MOCK_MLFLOW_RUNTIME_STATUS.activeDbModel,
            featureList: [...MOCK_MLFLOW_RUNTIME_STATUS.activeDbModel.featureList],
          }
        : null,
      agentModel: { ...MOCK_MLFLOW_RUNTIME_STATUS.agentModel },
    };
  }
}

export async function promoteMlflowModel(modelVersionId: string): Promise<AdminMlModelVersion> {
  try {
    const { data } = await api.patch<AdminMlModelVersion>(`/v1/admin/mlflow/models/${modelVersionId}/promote`);
    return data;
  } catch {
    const model = MOCK_ML_MODEL_VERSIONS.find((item) => item.id === modelVersionId) ?? MOCK_ML_MODEL_VERSIONS[0];
    return { ...model, status: 'ACTIVE', featureList: [...model.featureList] };
  }
}

export interface MlflowRetrainDecisionPayload {
  reasonCode?: string;
  reasonText?: string;
}

export async function requestMlflowRetrain(
  driftId: string,
  payload?: MlflowRetrainDecisionPayload
): Promise<AdminDriftAlert> {
  try {
    const { data } = await api.patch<AdminDriftAlert>(
      `/v1/admin/mlflow/drift-alerts/${driftId}/retrain-request`,
      payload ?? {}
    );
    return data;
  } catch {
    const alert = MOCK_DRIFT_ALERTS.find((item) => item.id === driftId) ?? MOCK_DRIFT_ALERTS[0];
    return {
      ...alert,
      isRetrainTriggered: true,
      retrainTriggeredAt: new Date().toISOString(),
    };
  }
}

export async function holdMlflowRetrain(
  driftId: string,
  payload?: MlflowRetrainDecisionPayload
): Promise<AdminDriftAlert> {
  try {
    const { data } = await api.patch<AdminDriftAlert>(
      `/v1/admin/mlflow/drift-alerts/${driftId}/retrain-hold`,
      payload ?? {}
    );
    return data;
  } catch {
    const alert = MOCK_DRIFT_ALERTS.find((item) => item.id === driftId) ?? MOCK_DRIFT_ALERTS[0];
    return {
      ...alert,
      isRetrainTriggered: false,
      retrainTriggeredAt: null,
    };
  }
}

// ── 라벨링 기준 관리 ─────────────────────────────────────────────────────────

export async function fetchActiveLabelingRule(): Promise<AdminLabelingRule> {
  try {
    const { data } = await api.get<AdminLabelingRule>('/v1/admin/labeling-rules/active');
    return data;
  } catch {
    return { ...(MOCK_LABELING_RULES.find((rule) => rule.isActive) ?? MOCK_LABELING_RULES[0]) };
  }
}

export async function fetchLabelingRuleHistory(): Promise<AdminLabelingRule[]> {
  try {
    const { data } = await api.get<AdminLabelingRule[]>('/v1/admin/labeling-rules/history');
    return data;
  } catch {
    return MOCK_LABELING_RULES.map((rule) => ({ ...rule }));
  }
}

export async function previewLabelingRule(req: AdminLabelingPreviewRequest): Promise<AdminLabelingPreview> {
  try {
    const { data } = await api.post<AdminLabelingPreview>('/v1/admin/labeling-rules/preview', req);
    return data;
  } catch {
    return buildMockLabelingPreview(req);
  }
}

export async function createLabelingRule(
  req: AdminLabelingPreviewRequest & { changeReason: string }
): Promise<AdminLabelingRule> {
  try {
    const { data } = await api.post<AdminLabelingRule>('/v1/admin/labeling-rules', req);
    return data;
  } catch {
    const preview = buildMockLabelingPreview(req);
    return {
      ruleId: `label-rule-demo-${Date.now()}`,
      ruleVersion: 8,
      versionLabel: 'v8 · 운영 기준',
      lookaheadMin: req.lookaheadMin,
      qQuantile: req.qQuantile,
      qMaxQuantile: req.qMaxQuantile,
      wQuantile: req.wQuantile,
      wipQuantile: req.wipQuantile,
      aQuantile: req.aQuantile,
      uHiQuantile: req.uHiQuantile,
      uLoQuantile: req.uLoQuantile,
      qCut: preview.qCut,
      qMaxCut: preview.qMaxCut,
      wCut: preview.wCut,
      wipCut: preview.wipCut,
      aCut: preview.aCut,
      uHiCut: preview.uHiCut,
      uLoCut: preview.uLoCut,
      resolvedRunId: preview.resolvedRunId,
      resolvedAt: new Date().toISOString(),
      isActive: true,
      changeReason: req.changeReason,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
    };
  }
}

function buildMockLabelingPreview(req: AdminLabelingPreviewRequest): AdminLabelingPreview {
  const qShift = (0.97 - req.qQuantile) * 100;
  const wipShift = (0.975 - req.wipQuantile) * 120;
  return {
    ...MOCK_LABELING_PREVIEW,
    qCut: round2(54.8 - qShift),
    qMaxCut: round2(62.96 - qShift * 0.8),
    wCut: round3(0.5 - (0.965 - req.wQuantile)),
    wipCut: round2(10 - wipShift),
    aCut: round3(Math.max(0.01, req.aQuantile * 10)),
    uHiCut: round3(0.994 - (0.75 - req.uHiQuantile) * 0.1),
    uLoCut: round3(0.72 + (0.95 - req.uLoQuantile) * 0.2),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
