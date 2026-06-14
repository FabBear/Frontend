export type AdminUserRole = 'ADMIN' | 'ENGINEER' | 'VIEWER';

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
  toolgroup: string;
  fn: number;
  fp: number;
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
  id: string;
  name: string;
  role: AdminUserRole;
  department: string;
  fabAccess: string;
  lastLogin: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  isActive: boolean;
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
  label: string;
  activeVersion: string;
  updatedBy: string;
  updatedAt: string;
  changeReason: string;
  body: string;
  variables: Array<{ token: string; description: string }>;
}

export interface AdminPromptVersion {
  id: string;
  templateId: string;
  version: string;
  body: string;
  updatedAt: string;
  updatedBy: string;
  changeReason: string;
  status: 'ACTIVE' | 'PREVIOUS';
}
