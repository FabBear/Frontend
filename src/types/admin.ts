export type AdminUserRole = 'ADMIN' | 'ENGINEER';

export type AdminResourceKey = 'thresholds' | 'access' | 'mlflow' | 'mesInterface' | 'prompts' | 'ingestion' | 'logs';

export type AdminStatus = 'NORMAL' | 'WARNING' | 'ERROR' | 'DISABLED';

export interface AdminResourceMeta {
  key: AdminResourceKey;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  createLabel?: string;
}

export interface AdminResourceItem {
  id: string;
  resourceKey: AdminResourceKey;
  primary: string;
  secondary: string;
  category: string;
  status: AdminStatus;
  owner: string;
  updatedAt: string;
  metrics: Array<{ label: string; value: string }>;
}

export interface AdminThresholdConfig {
  id: string;
  fabId?: string;
  category: 'BOTTLENECK' | 'KPI' | 'ACTION_RULE';
  configKey: string;
  configValue: string;
  valueType: 'FLOAT' | 'INT' | 'STRING' | 'BOOL';
  description: string;
  unit?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminThresholdHistory {
  changedAt: string;
  itemName: string;
  before: string;
  after: string;
  changedBy: string;
}

export interface AdminMlModelVersion {
  id: string;
  mlflowRunId: string;
  mlflowVersion: string;
  modelName: string;
  trainedAt: string;
  accuracy: number;
  f1Score: number;
  aucRoc: number;
  trainRowCount: number;
  featureList: string[];
  status: 'ACTIVE' | 'STAGING' | 'RETIRED';
  registeredAt: string;
}

export interface DriftReportContributor {
  toolgroup?: string;
  tg_name?: string;
  fn: number;
  fp: number;
}

export interface DriftRetrainDecision {
  status?: 'APPROVED' | 'ON_HOLD' | string;
  trigger_status?: 'REQUESTED' | 'DEFERRED' | string;
  trigger_mode?: string;
  pipeline_status?: 'PENDING_ML_PIPELINE' | 'ON_HOLD' | string;
  decided_at?: string;
  decided_by_user_id?: string;
  decided_by_login_id?: string;
  decided_by_name?: string;
  approved_at?: string;
  approved_by_user_id?: string;
  approved_by_login_id?: string;
  approved_by_name?: string;
  reason_code?: string | null;
  reason_text?: string | null;
  reasonCode?: string | null;
  reasonText?: string | null;
  reason?: string | null;
  next_step?: string;
}

export interface DriftReportDetail {
  f1_baseline: number | null;
  f1_current: number;
  threshold: number;
  eval_window_hours: number;
  sample_count: number;
  top_contributors: DriftReportContributor[];
  active_version?: string;
  recommendation?: string;
  retrain_decision?: DriftRetrainDecision;
  retrain_approval?: DriftRetrainDecision;
}

export interface AdminDriftAlert {
  id: string;
  modelVersionId: string;
  detectedAt: string;
  triggerType: 'PSI' | 'F1';
  psiScore: number | null;
  f1AtDetection: number | null;
  isRetrainTriggered: boolean;
  retrainTriggeredAt: string | null;
  resultingModelVersionId: string | null;
  alertStatus?: 'NEW' | 'ACK' | 'CLOSED';
  detail?: DriftReportDetail | null;
}

export interface AdminAccessUser {
  userId: string;
  id: string;
  name: string;
  role: AdminUserRole;
  department: string;
  fabAccess: string;
  lastLogin: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  isActive: boolean;
  password?: string;
  passwordConfirm?: string;
}

export interface AdminMesFieldMapping {
  id: string;
  fabId?: string;
  customerMetricName: string;
  externalField: string;
  internalField: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATETIME' | 'ENUM';
  metricScope: 'FAB' | 'TOOL_GROUP' | 'TOOL';
  transformRule: string;
  isRequired: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminPromptTemplate {
  id: string;
  category?: string;
  label: string;
  description?: string;
  activeVersion: string;
  updatedBy: string;
  updatedAt: string;
  changeReason: string;
  body: string;
  variables: Array<{ token: string; description: string }>;
  variablesSchema?: AdminPromptVariablesSchema | null;
}

export interface AdminPromptVersion {
  id: string;
  templateId: string;
  versionNo?: number;
  version: string;
  body: string;
  updatedAt: string;
  updatedBy: string;
  changeReason: string;
  status: 'ACTIVE' | 'PREVIOUS';
  variablesSchema?: AdminPromptVariablesSchema | null;
}

export interface AdminPromptVariablesSchema {
  exposure?: string;
  sourcePath?: string;
  runtimeUsage?: string;
  visibleSections?: string[];
  hiddenSections?: string[];
  variables?: Array<{ token: string; description: string }>;
}
