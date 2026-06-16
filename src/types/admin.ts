export type AdminUserRole = 'ADMIN' | 'ENGINEER';

export type AdminResourceKey =
  | 'labelingRules'
  | 'access'
  | 'mlflow'
  | 'mesInterface'
  | 'prompts'
  | 'ingestion'
  | 'logs';

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
  pipeline_status?:
    | 'PENDING_ML_PIPELINE'
    | 'QUEUED'
    | 'RUNNING'
    | 'STAGING_READY'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'QUEUE_FAILED'
    | 'QUEUE_DISABLED'
    | 'ON_HOLD'
    | string;
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
  runner?: string;
  requested_by?: string;
  requested_by_login_id?: string;
  requested_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  jenkins_job?: string;
  jenkins_queue_url?: string | null;
  jenkins_build_url?: string | null;
  jenkins_build_number?: string | null;
  jenkins_trigger_http_status?: number;
  resulting_model_version_id?: string;
  resulting_mlflow_version?: string;
  error_message?: string;
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

export interface AdminMlflowAliasStatus {
  modelName: string;
  alias: string;
  version: string | null;
  available: boolean;
  errorMessage: string | null;
}

export interface AdminAgentModelStatus {
  modelName: string;
  alias: string;
  loadedVersion: string | null;
  source: 'MLFLOW' | 'LOCAL_FALLBACK' | string | null;
  lastRefreshAt: string | null;
  available: boolean;
  errorMessage: string | null;
}

export interface AdminMlflowRuntimeStatus {
  productionAlias: AdminMlflowAliasStatus;
  activeDbModel: AdminMlModelVersion | null;
  agentModel: AdminAgentModelStatus;
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
  purpose?: string;
  inputSpec?: string;
  outputSpec?: string;
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

// ── 라벨링 기준 관리 ────────────────────────────────────────────────────────

export interface AdminLabelingRule {
  ruleId: string;
  ruleVersion: number;
  versionLabel: string;
  lookaheadMin: number;
  // 분위수 knob
  qQuantile: number;
  qMaxQuantile: number;
  wQuantile: number;
  wipQuantile: number;
  aQuantile: number;
  uHiQuantile: number;
  uLoQuantile: number;
  // 환산 절대 cutoff
  qCut: number | null;
  qMaxCut: number | null;
  wCut: number | null;
  wipCut: number | null;
  aCut: number | null;
  uHiCut: number | null;
  uLoCut: number | null;
  resolvedRunId: string | null;
  resolvedAt: string | null;
  isActive: boolean;
  changeReason: string | null;
  createdAt: string;
  createdBy: string;
}

export interface AdminLabelingPreviewRequest {
  lookaheadMin: number;
  qQuantile: number;
  qMaxQuantile: number;
  wQuantile: number;
  wipQuantile: number;
  aQuantile: number;
  uHiQuantile: number;
  uLoQuantile: number;
  windowMinutes?: number;
}

export interface AdminLabelingPreview {
  evaluated: number;
  skipped: number;
  beforePositive: number;
  afterPositive: number;
  changed: number;
  qCut: number | null;
  qMaxCut: number | null;
  wCut: number | null;
  wipCut: number | null;
  aCut: number | null;
  uHiCut: number | null;
  uLoCut: number | null;
  resolvedRunId: string | null;
}

export interface AdminPromptVariablesSchema {
  exposure?: string;
  sourcePath?: string;
  runtimeUsage?: string;
  visibleSections?: string[];
  hiddenSections?: string[];
  variables?: Array<{ token: string; description: string }>;
}
