import type {
  AdminAccessUser,
  AdminDriftAlert,
  AdminLabelingPreview,
  AdminLabelingRule,
  AdminMesFieldMapping,
  AdminMlModelVersion,
  AdminMlflowRuntimeStatus,
  AdminPromptTemplate,
  AdminPromptVersion,
  AdminResourceItem,
  AdminResourceKey,
  AdminResourceMeta,
} from '@/types/admin';

export const ADMIN_RESOURCE_META: Record<AdminResourceKey, AdminResourceMeta> = {
  labelingRules: {
    key: 'labelingRules',
    title: '라벨링 기준 관리',
    description: '병목 판정 정답 라벨을 산출하는 분위수 기준을 관리합니다.',
    primaryLabel: '기준 버전',
    secondaryLabel: '상태',
  },
  access: {
    key: 'access',
    title: '권한 관리',
    description: '사용자 계정과 역할을 조회합니다.',
    primaryLabel: '사용자',
    secondaryLabel: '역할',
  },
  mlflow: {
    key: 'mlflow',
    title: 'MLflow 모니터링',
    description: '모델 버전 메타데이터를 조회합니다.',
    primaryLabel: '모델',
    secondaryLabel: 'Stage',
  },
  mesInterface: {
    key: 'mesInterface',
    title: 'MES 인터페이스',
    description: '고객 MES 필드와 표준 필드 매핑을 조회합니다.',
    primaryLabel: '인터페이스',
    secondaryLabel: 'Endpoint',
  },
  prompts: {
    key: 'prompts',
    title: '프롬프트 관리',
    description: '활성 프롬프트 버전을 조회합니다.',
    primaryLabel: '프롬프트',
    secondaryLabel: 'Agent',
  },
  ingestion: {
    key: 'ingestion',
    title: '데이터 수집',
    description: '수집 잡 상태와 수신 현황을 조회합니다.',
    primaryLabel: '수집 잡',
    secondaryLabel: '스케줄',
  },
  logs: {
    key: 'logs',
    title: '운영 로그',
    description: '시스템 감사 로그를 조회합니다.',
    primaryLabel: '이벤트',
    secondaryLabel: '소스',
  },
};

export const MOCK_ADMIN_ITEMS: AdminResourceItem[] = [
  item(
    'access',
    'engineer01',
    '김엔지니어',
    'ENGINEER',
    'NORMAL',
    'Etch 팀',
    '공장 권한: 이천',
    '마지막 로그인: 2026-05-07 09:21'
  ),
  item(
    'access',
    'engineer02',
    '이엔지니어',
    'ENGINEER',
    'NORMAL',
    'Litho 팀',
    '공장 권한: 이천, 청주',
    '마지막 로그인: 2026-05-07 08:45'
  ),
  item(
    'access',
    'admin01',
    '박관리자',
    'ADMIN',
    'NORMAL',
    '공정팀',
    '공장 권한: 전체',
    '마지막 로그인: 2026-05-07 07:00'
  ),
  item('mlflow', 'bottleneck-xgb', 'v4', 'th_ml_model_version', 'NORMAL', 'MLflow', 'accuracy 92.3%', 'f1 0.891'),
  item('mesInterface', 'TOOL_ID', 'tool_id', 'tm_mes_field_mapping', 'NORMAL', 'MES', 'type=string', '변환 규칙 없음'),
  item(
    'mesInterface',
    'STAT',
    'status',
    'tm_mes_field_mapping',
    'NORMAL',
    'MES',
    'type=enum',
    'PROC→PROCESSING, SU→SETUP'
  ),
  item(
    'mesInterface',
    'UTIL',
    'utilization_rate',
    'tm_mes_field_mapping',
    'NORMAL',
    'MES',
    'type=decimal',
    '변환 규칙 없음'
  ),
  item(
    'mesInterface',
    'Q_LOT',
    'waiting_lot',
    'tm_mes_field_mapping',
    'NORMAL',
    'MES',
    'type=integer',
    '변환 규칙 없음'
  ),
  item(
    'prompts',
    'CAUSE_ANALYSIS',
    'v1 활성',
    'tm_prompt_template',
    'NORMAL',
    'admin',
    '변경 사유: 프롬프트 기준선 등록',
    'AI-Agent 연동 기준선'
  ),
  item(
    'prompts',
    'ACTION_PLAN_COMPARE',
    'v2 활성',
    'tm_prompt_template',
    'NORMAL',
    'admin',
    '변경 사유: 추천 기준 보강',
    'tie-breaker chain 명시'
  ),
  item(
    'prompts',
    'REPORT_GEN',
    'v2 활성',
    'tm_prompt_template',
    'NORMAL',
    'admin',
    '변경 사유: 보고서 출력 기준 보강',
    '출력 형식 제약 명시'
  ),
  item(
    'prompts',
    'CHATBOT',
    'v2 활성',
    'tm_prompt_template',
    'NORMAL',
    'admin',
    '변경 사유: 제약 블록 추가',
    '보안·데이터 출처 준수 규칙'
  ),
  ingestionJob(
    'MES_COLLECT_JOB',
    '30초',
    'tb_mes_collect_job',
    'NORMAL',
    'MES팀',
    '2026-06-08 09:48:22',
    '7,240건 / 1h',
    '99.8%',
    '-'
  ),
  ingestionJob(
    'MES_HEALTH_CHECK',
    '60초',
    'tb_mes_collect_job',
    'WARNING',
    'MES팀',
    '2026-06-08 09:47:01',
    '58건 / 1h',
    '96.6%',
    '실패 2건 — 응답 지연'
  ),
  ingestionJob(
    'WIP_COLLECT',
    '5분',
    'tb_wip_snapshot',
    'NORMAL',
    'MES팀',
    '2026-06-08 09:45:00',
    '480건 / 1h',
    '100%',
    '-'
  ),
  ingestionJob(
    'TOOL_STATUS_SYNC',
    '1분',
    'tb_tool_status',
    'NORMAL',
    'Equip팀',
    '2026-06-08 09:48:00',
    '2,160건 / 1h',
    '100%',
    '-'
  ),
  ingestionJob(
    'QUEUE_LOT_COLLECT',
    '1분',
    'tb_queue_lot',
    'NORMAL',
    'MES팀',
    '2026-06-08 09:47:59',
    '2,158건 / 1h',
    '99.9%',
    '-'
  ),
  ingestionJob(
    'ALARM_COLLECT',
    '30초',
    'tb_equipment_alarm',
    'ERROR',
    'Equip팀',
    '2026-06-08 08:12:44',
    '0건 / 1h',
    '0%',
    'TCP 연결 실패 — 재시도 초과'
  ),
  ingestionJob(
    'UTILIZATION_CALC',
    '5분',
    'tb_utilization_rate',
    'NORMAL',
    '공정팀',
    '2026-06-08 09:45:00',
    '480건 / 1h',
    '100%',
    '-'
  ),
  ingestionJob(
    'MES_FIELD_VALIDATE',
    '10분',
    'tb_mes_field_mapping',
    'DISABLED',
    'MES팀',
    '2026-06-07 18:00:00',
    '-',
    '-',
    '점검 중 비활성화'
  ),
  item(
    'logs',
    '사용자 계정 변경 감사',
    '감사 로그',
    'Audit',
    'NORMAL',
    'System',
    '대상: 사용자 계정',
    '등록 / 수정 / 삭제'
  ),
  item(
    'logs',
    '역할·권한 변경 감사',
    '감사 로그',
    'Audit',
    'NORMAL',
    'System',
    '대상: 역할·권한',
    '등록 / 수정 / 삭제'
  ),
];

export const MOCK_ML_MODEL_VERSIONS: AdminMlModelVersion[] = [
  mlModel(
    'mv-004',
    'run_bnxgb_20260607_004',
    '4',
    'bottleneck_xgboost',
    '2026-06-07 22:10',
    0.923,
    0.891,
    0.947,
    148_220,
    ['utilization_rate', 'wip_count', 'wait_ratio', 'q_time_min', 'available_tool_ratio'],
    'ACTIVE',
    '2026-06-08 08:30'
  ),
  mlModel(
    'mv-005',
    'run_bnxgb_20260608_005',
    '5',
    'bottleneck_xgboost',
    '2026-06-08 03:40',
    0.931,
    0.904,
    0.956,
    152_840,
    ['utilization_rate', 'wip_count', 'wait_ratio', 'q_time_min', 'max_q_len', 'available_tool_ratio'],
    'STAGING',
    '2026-06-08 04:20'
  ),
  mlModel(
    'mv-003',
    'run_bnxgb_20260601_003',
    '3',
    'bottleneck_xgboost',
    '2026-06-01 01:15',
    0.887,
    0.852,
    0.918,
    136_500,
    ['utilization_rate', 'wip_count', 'wait_ratio', 'q_time_min'],
    'RETIRED',
    '2026-06-01 02:00'
  ),
];

export const MOCK_DRIFT_ALERTS: AdminDriftAlert[] = [
  {
    ...driftAlert(
      'drift-001',
      'mv-004',
      '2026-06-08T09:20:00Z',
      'PSI',
      0.218,
      0.879,
      true,
      '2026-06-08T09:35:00Z',
      'mv-005'
    ),
    detail: {
      f1_baseline: 0.891,
      f1_current: 0.879,
      threshold: 0.88,
      eval_window_hours: 24,
      sample_count: 7240,
      top_contributors: [
        { tg_name: 'DE_FE_1', fn: 8, fp: 3 },
        { tg_name: 'IMP_ION_56', fn: 5, fp: 2 },
        { tg_name: 'CVD_HDP_3', fn: 3, fp: 1 },
      ],
      retrain_decision: {
        status: 'APPROVED',
        trigger_status: 'REQUESTED',
        pipeline_status: 'STAGING_READY',
        decided_at: '2026-06-08T09:35:00Z',
        decided_by_name: '박관리자',
        reason_code: 'F1_BELOW_THRESHOLD',
        reason_text: 'F1이 임계값보다 낮음',
        resulting_mlflow_version: '5',
      },
    },
  },
  {
    ...driftAlert('drift-002', 'mv-004', '2026-06-07T18:00:00Z', 'F1', null, 0.841, false, null, null),
    detail: {
      f1_baseline: 0.891,
      f1_current: 0.841,
      threshold: 0.87,
      eval_window_hours: 12,
      sample_count: 3620,
      top_contributors: [
        { tg_name: 'DE_FE_1', fn: 4, fp: 1 },
        { tg_name: 'WET_CLN_2', fn: 2, fp: 2 },
      ],
    },
  },
  {
    ...driftAlert(
      'drift-003',
      'mv-003',
      '2026-06-03T11:30:00Z',
      'PSI',
      0.263,
      0.816,
      true,
      '2026-06-03T12:05:00Z',
      'mv-004'
    ),
    detail: {
      f1_baseline: 0.852,
      f1_current: 0.816,
      threshold: 0.84,
      eval_window_hours: 24,
      sample_count: 6810,
      top_contributors: [
        { tg_name: 'CVD_200', fn: 6, fp: 4 },
        { tg_name: 'DE_FE_12', fn: 5, fp: 2 },
      ],
      retrain_decision: {
        status: 'APPROVED',
        trigger_status: 'REQUESTED',
        pipeline_status: 'SUCCEEDED',
        decided_at: '2026-06-03T12:05:00Z',
        decided_by_name: '박관리자',
        reason_code: 'F1_BELOW_THRESHOLD',
        reason_text: 'F1이 임계값보다 낮음',
        resulting_mlflow_version: '4',
      },
    },
  },
];

export const MOCK_MLFLOW_RUNTIME_STATUS: AdminMlflowRuntimeStatus = {
  productionAlias: {
    modelName: 'bottleneck_xgboost',
    alias: 'production',
    version: '4',
    available: true,
    errorMessage: null,
  },
  activeDbModel: MOCK_ML_MODEL_VERSIONS[0] ?? null,
  agentModel: {
    modelName: 'bottleneck_xgboost',
    alias: 'production',
    loadedVersion: '4',
    source: 'MLFLOW',
    lastRefreshAt: '2026-06-14T14:12:46Z',
    available: true,
    errorMessage: null,
  },
};

export const MOCK_ACCESS_USERS: AdminAccessUser[] = [
  accessUser('admin', '관리자', 'ADMIN', '운영관리', 'SK하이닉스 이천 FAB', '2026-06-08 09:20', 'ACTIVE', true),
  accessUser(
    'engineer01',
    '공정 엔지니어',
    'ENGINEER',
    '공정팀',
    'SK하이닉스 이천 FAB',
    '2026-06-08 09:18',
    'ACTIVE',
    true
  ),
];

export const MOCK_MES_FIELD_MAPPINGS: AdminMesFieldMapping[] = [
  // FAB 레벨 KPI
  mesField('가동률', 'utilization', 'utilization_rate', 'NUMBER', 'FAB', '-', true, true, '2026-06-08'),
  mesField('WIP 수량', 'wip', 'wip_count', 'NUMBER', 'FAB', '-', true, true, '2026-06-08'),
  mesField('평균 대기시간', 'q_time_min', 'avg_qtime_min', 'NUMBER', 'FAB', '분(min) 단위', true, true, '2026-06-08'),
  mesField('RTF', 'rtf', 'rtf', 'NUMBER', 'FAB', '-', false, true, '2026-06-08'),
  mesField('TAT', 'tat_min', 'tat_min', 'NUMBER', 'FAB', '분(min) 단위', false, true, '2026-06-08'),
  mesField('24h 처리량', 'throughput_24h', 'throughput_24h', 'NUMBER', 'FAB', '-', false, true, '2026-06-08'),
  // Tool Group 레벨 KPI
  mesField('가동률 평균', 'utilization_avg', 'utilization_rate', 'NUMBER', 'TOOL_GROUP', '-', true, true, '2026-06-08'),
  mesField(
    '가용 설비 비율',
    'available_tool_ratio',
    'available_tool_ratio',
    'NUMBER',
    'TOOL_GROUP',
    '-',
    false,
    true,
    '2026-06-08'
  ),
  mesField('셋업 비율 평균', 'setup_ratio_avg', 'setup_ratio', 'NUMBER', 'TOOL_GROUP', '-', false, true, '2026-06-08'),
  mesField('대기 비율', 'wait_ratio', 'wait_ratio', 'NUMBER', 'TOOL_GROUP', '-', false, true, '2026-06-08'),
  // Tool 레벨 KPI
  mesField('OEE', 'oee_estimate', 'oee_estimate', 'NUMBER', 'TOOL', '-', false, true, '2026-06-08'),
  mesField('평균 대기시간', 'avg_q_time', 'avg_qtime_min', 'NUMBER', 'TOOL', '분(min) 단위', false, true, '2026-06-08'),
  mesField('대기 Lot 수', 'q_len', 'queue_lot_count', 'NUMBER', 'TOOL', '-', false, true, '2026-06-08'),
  mesField('셋업 비율', 'setup_ratio', 'setup_ratio', 'NUMBER', 'TOOL', '-', false, true, '2026-06-08'),
  mesField('다운 비율', 'down_ratio', 'down_ratio', 'NUMBER', 'TOOL', '-', false, true, '2026-06-08'),
];

export const MOCK_MES_HEALTH = {
  lastCollectAt: '2026-06-14T14:12:45Z',
  lastStatus: 'SUCCESS',
  lastCollectedCount: 7240,
  totalJobs: 22,
  successCount: 16,
  failedCount: 3,
  runningCount: 3,
  recentSuccessRate: 0.842,
};

export const MOCK_MES_COLLECT_JOBS = [
  {
    jobId: 'MES_SNAPSHOT_20260614_2312',
    scheduledAt: '2026-06-14T14:12:00Z',
    startedAt: '2026-06-14T14:12:01Z',
    completedAt: '2026-06-14T14:12:09Z',
    status: 'SUCCESS',
    collectedCount: 7240,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'TOOL_STATUS_SYNC_20260614_2312',
    scheduledAt: '2026-06-14T14:12:00Z',
    startedAt: '2026-06-14T14:12:02Z',
    completedAt: '2026-06-14T14:12:05Z',
    status: 'SUCCESS',
    collectedCount: 2160,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'LOT_QUEUE_ROLLUP_20260614_2311',
    scheduledAt: '2026-06-14T14:11:30Z',
    startedAt: '2026-06-14T14:11:31Z',
    completedAt: '2026-06-14T14:11:38Z',
    status: 'SUCCESS',
    collectedCount: 3850,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'WIP_SNAPSHOT_20260614_2311',
    scheduledAt: '2026-06-14T14:11:00Z',
    startedAt: '2026-06-14T14:11:01Z',
    completedAt: '2026-06-14T14:11:08Z',
    status: 'SUCCESS',
    collectedCount: 10405,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'ALARM_COLLECT_20260614_2310',
    scheduledAt: '2026-06-14T14:10:00Z',
    startedAt: '2026-06-14T14:10:04Z',
    completedAt: '2026-06-14T14:10:21Z',
    status: 'FAILED',
    collectedCount: 0,
    errorCount: 1,
    retryCount: 3,
    lastErrorMsg: 'TCP 연결 지연으로 3회 재시도 후 보류',
  },
  {
    jobId: 'DISPATCH_LOG_COLLECT_20260614_2309',
    scheduledAt: '2026-06-14T14:09:00Z',
    startedAt: '2026-06-14T14:09:02Z',
    completedAt: '2026-06-14T14:09:10Z',
    status: 'SUCCESS',
    collectedCount: 612,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'RECIPE_STATE_SYNC_20260614_2308',
    scheduledAt: '2026-06-14T14:08:00Z',
    startedAt: '2026-06-14T14:08:02Z',
    completedAt: '2026-06-14T14:08:13Z',
    status: 'SUCCESS',
    collectedCount: 1488,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'DOWNTIME_EVENT_SYNC_20260614_2307',
    scheduledAt: '2026-06-14T14:07:00Z',
    startedAt: '2026-06-14T14:07:03Z',
    completedAt: '2026-06-14T14:07:16Z',
    status: 'SUCCESS',
    collectedCount: 74,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'LOT_TRACK_OUT_20260614_2306',
    scheduledAt: '2026-06-14T14:06:00Z',
    startedAt: '2026-06-14T14:06:01Z',
    completedAt: '2026-06-14T14:06:09Z',
    status: 'SUCCESS',
    collectedCount: 920,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'PROCESS_KPI_AGG_20260614_2305',
    scheduledAt: '2026-06-14T14:05:00Z',
    startedAt: '2026-06-14T14:05:02Z',
    completedAt: '2026-06-14T14:05:20Z',
    status: 'SUCCESS',
    collectedCount: 168,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'TOOL_HEARTBEAT_20260614_2304',
    scheduledAt: '2026-06-14T14:04:00Z',
    startedAt: '2026-06-14T14:04:01Z',
    completedAt: null,
    status: 'RUNNING',
    collectedCount: 1320,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'QUEUE_TIME_ROLLUP_20260614_2303',
    scheduledAt: '2026-06-14T14:03:00Z',
    startedAt: '2026-06-14T14:03:03Z',
    completedAt: '2026-06-14T14:03:16Z',
    status: 'SUCCESS',
    collectedCount: 392,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'EQUIPMENT_ALARM_RETRY_20260614_2302',
    scheduledAt: '2026-06-14T14:02:00Z',
    startedAt: '2026-06-14T14:02:04Z',
    completedAt: null,
    status: 'RETRYING',
    collectedCount: 48,
    errorCount: 2,
    retryCount: 2,
    lastErrorMsg: 'ALARM_TOPIC partition 3 offset 지연',
  },
  {
    jobId: 'LOT_HOLD_STATUS_20260614_2301',
    scheduledAt: '2026-06-14T14:01:00Z',
    startedAt: '2026-06-14T14:01:01Z',
    completedAt: '2026-06-14T14:01:06Z',
    status: 'SUCCESS',
    collectedCount: 88,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'TOOL_GROUP_KPI_20260614_2300',
    scheduledAt: '2026-06-14T14:00:00Z',
    startedAt: '2026-06-14T14:00:01Z',
    completedAt: '2026-06-14T14:00:18Z',
    status: 'SUCCESS',
    collectedCount: 162,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'MATERIAL_MOVE_EVENT_20260614_2259',
    scheduledAt: '2026-06-14T13:59:00Z',
    startedAt: '2026-06-14T13:59:02Z',
    completedAt: '2026-06-14T13:59:14Z',
    status: 'SUCCESS',
    collectedCount: 2780,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'TOOL_STATUS_SYNC_20260614_2258',
    scheduledAt: '2026-06-14T13:58:00Z',
    startedAt: '2026-06-14T13:58:03Z',
    completedAt: '2026-06-14T13:58:11Z',
    status: 'SUCCESS',
    collectedCount: 2158,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'MES_SNAPSHOT_20260614_2257',
    scheduledAt: '2026-06-14T13:57:00Z',
    startedAt: '2026-06-14T13:57:01Z',
    completedAt: '2026-06-14T13:57:07Z',
    status: 'SUCCESS',
    collectedCount: 7188,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'LOT_ROUTE_SYNC_20260614_2256',
    scheduledAt: '2026-06-14T13:56:00Z',
    startedAt: '2026-06-14T13:56:03Z',
    completedAt: '2026-06-14T13:56:34Z',
    status: 'FAILED',
    collectedCount: 124,
    errorCount: 6,
    retryCount: 1,
    lastErrorMsg: 'ROUTE_CODE 누락 row 6건',
  },
  {
    jobId: 'FAB_CALENDAR_SYNC_20260614_2255',
    scheduledAt: '2026-06-14T13:55:00Z',
    startedAt: null,
    completedAt: null,
    status: 'PENDING',
    collectedCount: 0,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'DISPATCH_RULE_AUDIT_20260614_2254',
    scheduledAt: '2026-06-14T13:54:00Z',
    startedAt: '2026-06-14T13:54:01Z',
    completedAt: '2026-06-14T13:54:08Z',
    status: 'SUCCESS',
    collectedCount: 36,
    errorCount: 0,
    retryCount: 0,
    lastErrorMsg: null,
  },
  {
    jobId: 'TOOL_AVAILABILITY_SYNC_20260614_2253',
    scheduledAt: '2026-06-14T13:53:00Z',
    startedAt: '2026-06-14T13:53:03Z',
    completedAt: '2026-06-14T13:53:19Z',
    status: 'FAILED',
    collectedCount: 904,
    errorCount: 4,
    retryCount: 2,
    lastErrorMsg: 'DOWN 상태 코드 매핑 누락',
  },
];

export const MOCK_LABELING_RULES: AdminLabelingRule[] = [
  labelingRule(
    'label-rule-007',
    7,
    'v7 · DE_FE_1 운영 기준',
    120,
    0.97,
    0.97,
    0.965,
    0.975,
    0.01,
    0.75,
    0.95,
    54.8,
    62.96,
    0.5,
    10,
    0.1,
    0.994,
    0.72,
    'bnc-run-de-fe-1-20260614-141246',
    '2026-06-14T14:12:46Z',
    true,
    'DE_FE_1 병목 리포트 기준으로 큐·가동률 민감도 보정',
    '2026-06-14T14:12:46Z',
    'admin'
  ),
  labelingRule(
    'label-rule-006',
    6,
    'v6 · 설비 포화 보강',
    120,
    0.965,
    0.965,
    0.96,
    0.97,
    0.015,
    0.78,
    0.94,
    57.2,
    65.4,
    0.55,
    12,
    0.12,
    0.991,
    0.75,
    'bnc-run-we-fe-8-20260613-165200',
    '2026-06-13T16:52:30Z',
    false,
    '설비 포화 원인 케이스 반영',
    '2026-06-13T16:52:30Z',
    'admin'
  ),
  labelingRule(
    'label-rule-005',
    5,
    'v5 · 기본 분위수',
    120,
    0.95,
    0.95,
    0.95,
    0.95,
    0.02,
    0.8,
    0.92,
    61.5,
    70.1,
    0.62,
    15,
    0.15,
    0.988,
    0.78,
    'bnc-run-baseline-20260608-083000',
    '2026-06-08T08:30:00Z',
    false,
    '초기 운영 기준 배포',
    '2026-06-08T08:30:00Z',
    'admin'
  ),
];

export const MOCK_LABELING_PREVIEW: AdminLabelingPreview = {
  evaluated: 7240,
  skipped: 18,
  beforePositive: 43,
  afterPositive: 51,
  changed: 8,
  qCut: 54.8,
  qMaxCut: 62.96,
  wCut: 0.5,
  wipCut: 10,
  aCut: 0.1,
  uHiCut: 0.994,
  uLoCut: 0.72,
  resolvedRunId: 'bnc-run-de-fe-1-20260614-141246',
};

// ── 프롬프트 본문 상수 ────────────────────────────────────────────────────────

const _CAUSE_ANALYSIS_V1 = `당신은 반도체 FAB 병목 원인 분석 전문가입니다. 반드시 한국어로만 답변하세요.

[분석 맥락]
- 병목 공정: {tool_group}
- 병목 확률: {bottleneck_probability}%
- SHAP 주요 기여 피처: {shap_features}
- 확산 영향 공정: {affected_processes}
- 가동률: {utilization_rate}%
- 대기 Lot: {waiting_lot}
- 감지 시각: {snapshot_time}

위 데이터를 바탕으로 병목 근본 원인, 설비·공정별 영향 범위, 우선 대응 방향을 간결하게 작성하세요.`;

const _ACTION_PLAN_COMPARE_V1 = `반도체 FAB 공정 병목 상황에서 현장 엔지니어가 즉각 행동할 수 있도록 지원하는 의사결정 AI입니다.
병목 원인 분석(SHAP·트렌드·업스트림·2h 예측)·시뮬레이션 KPI(paired t-test)·연쇄 영향·현재 상태·tie-breaker chain을 종합해
지금 무엇을 해야 하는지 실행 가능한 근거를 제공합니다.`;

const _ACTION_PLAN_COMPARE_V2 = `반도체 FAB 공정 병목 상황에서 현장 엔지니어가 즉각 행동할 수 있도록 지원하는 의사결정 AI입니다.
병목 원인 분석(SHAP·트렌드·업스트림·2h 예측)·시뮬레이션 KPI(paired t-test)·연쇄 영향·현재 상태·tie-breaker chain을 종합해
지금 무엇을 해야 하는지 실행 가능한 근거를 제공합니다.

[시스템 제약]
- 추천 대응안은 반드시 시뮬레이션 KPI 개선이 관측된 후보 중에서 선정합니다.
- 동점(tie)이 발생하면 tie-breaker chain(composite_score → paired_t_p → effort → reversibility) 순으로 판정합니다.
- 판정 근거는 decision_meta 필드에 구조화해 반환합니다.

[운영 조정]
- 추천 근거 서술의 강조점(KPI·리스크·업스트림)을 조정할 수 있습니다.
- 모니터링 KPI 목록과 rollback 조건 텍스트를 조정할 수 있습니다.`;

const _REPORT_GEN_V1 = `당신은 반도체 FAB 공정 병목 대응 의사결정 보고서의 narrative(서술 문장)를
작성하는 전문 AI입니다. 표 · KPI 카드 · 수치 비교는 별도 코드가 결정론적으로
생성하므로, 당신은 반드시 문장(narrative)만 작성합니다.`;

const _REPORT_GEN_V2 = `당신은 반도체 FAB 공정 병목 대응 의사결정 보고서의 narrative(서술 문장)를
작성하는 전문 AI입니다. 표 · KPI 카드 · 수치 비교는 별도 코드가 결정론적으로
생성하므로, 당신은 반드시 문장(narrative)만 작성합니다.

[출력 형식]
- 각 섹션은 지정된 헤더(## 원인 분석, ## 대응 근거, ## 향후 모니터링) 아래 작성합니다.
- 수치는 이미 생성된 표에 있으므로 narrative에 중복 기재하지 않습니다.
- 최대 3문단, 각 문단 4문장 이내로 작성합니다.

[서술 스타일]
- 보고서 어조(기술적/경영적)를 조정할 수 있습니다.
- 강조 섹션 순서를 변경할 수 있습니다.`;

const _CHATBOT_V1 = `너는 FabBear의 반도체 FAB 운영을 돕는 AI 어시스턴트다. 현직 공정/운영 엔지니어와 한국어로 자연스럽고 간결하게 대화한다.

[역할]
- 현장에서 라인 현황·설비·WIP·대기시간 등 운영 상황을 빠르게 이해하도록 돕는다.
- 사용자가 방금 본 화면 결과(현황 브리핑/TG 진단)가 컨텍스트로 주어지면, 그것을 근거로 이어서 설명한다.

[도메인 — 정확한 용어로 대화]
- WIP, 가동률(utilization), 가용률(availability), 대기시간(Q-time), X-factor(=실측/이론 가공시간; world-class 2.0~2.5, 일반 3~4), OEE, 셋업(setup), 라인 밸런스, PM(예방정비)/BM(돌발고장), Hold/Hot Lot, move/throughput.`;

const _CHATBOT_V2 = `너는 FabBear의 반도체 FAB 운영을 돕는 AI 어시스턴트다. 현직 공정/운영 엔지니어와 한국어로 자연스럽고 간결하게 대화한다.

[역할]
- 현장에서 라인 현황·설비·WIP·대기시간 등 운영 상황을 빠르게 이해하도록 돕는다.
- 사용자가 방금 본 화면 결과(현황 브리핑/TG 진단)가 컨텍스트로 주어지면, 그것을 근거로 이어서 설명한다.

[도메인 — 정확한 용어로 대화]
- WIP, 가동률(utilization), 가용률(availability), 대기시간(Q-time), X-factor(=실측/이론 가공시간; world-class 2.0~2.5, 일반 3~4), OEE, 셋업(setup), 라인 밸런스, PM(예방정비)/BM(돌발고장), Hold/Hot Lot, move/throughput.

[제약 — 반드시 준수]
- FabBear 시스템에서 제공된 데이터와 도구 결과만 근거로 사용한다. 추측 답변 시 반드시 "추정"임을 명시한다.
- Lot ID, 작업자명, 설비 시리얼 등 개인식별·보안 정보는 출력하지 않는다.
- 도구 호출 실패 시 "현재 {도구명} 데이터를 가져오지 못했습니다"로 명시하고 재시도를 안내한다.`;

export const MOCK_PROMPT_TEMPLATES: AdminPromptTemplate[] = [
  {
    id: 'CAUSE_ANALYSIS',
    category: 'CAUSE_ANALYSIS',
    label: '원인 분석',
    description: 'SHAP 피처 기반 병목 근본 원인 분석 프롬프트',
    purpose: '생산관리자 의사결정 요약',
    inputSpec: '병목 예측 + SHAP + 영향 공정',
    outputSpec: '원인·영향·대응 방향',
    activeVersion: 'v1',
    updatedBy: 'admin',
    updatedAt: '2026-01-15 09:00',
    changeReason: '프롬프트 기준선 등록 — AI-Agent 연동 기준선',
    body: _CAUSE_ANALYSIS_V1,
    variables: [
      { token: '{tool_group}', description: '병목 공정명' },
      { token: '{bottleneck_probability}', description: '확률 (%)' },
      { token: '{shap_features}', description: 'SHAP 결과' },
      { token: '{affected_processes}', description: '확산 공정' },
      { token: '{utilization_rate}', description: '가동률' },
      { token: '{waiting_lot}', description: '대기 Lot' },
      { token: '{snapshot_time}', description: '감지 시각' },
    ],
  },
  {
    id: 'ACTION_PLAN_COMPARE',
    category: 'ACTION_PLAN_COMPARE',
    label: '대응안 설명',
    description: '시뮬레이션 결과 기반 대응안 비교 및 추천 프롬프트',
    purpose: '대응 옵션별 효과 비교·추천',
    inputSpec: '시뮬레이션 KPI + 현재 상태',
    outputSpec: '대응 방향 근거 서술',
    activeVersion: 'v2',
    updatedBy: 'admin',
    updatedAt: '2026-06-10 11:00',
    changeReason: '추천 기준 보강 — tie-breaker chain 명시',
    body: _ACTION_PLAN_COMPARE_V2,
    variables: [],
  },
  {
    id: 'REPORT_GEN',
    category: 'REPORT_GEN',
    label: '리포트 생성',
    description: '병목 처리 전 과정 자연어 리포트 생성 프롬프트',
    purpose: '병목 대응 의사결정 보고서 narrative 생성',
    inputSpec: '처리 이력 + KPI + 시뮬레이션 비교',
    outputSpec: '임원 보고용 서술 문장',
    activeVersion: 'v2',
    updatedBy: 'admin',
    updatedAt: '2026-06-10 11:00',
    changeReason: '보고서 출력 기준 보강 — 출력 형식 및 서술 스타일 제약 명시',
    body: _REPORT_GEN_V2,
    variables: [],
  },
  {
    id: 'CHATBOT',
    category: 'CHATBOT',
    label: '챗봇 시스템',
    description: 'FAB 운영 질의응답 챗봇 프롬프트',
    purpose: 'FAB 운영 질의응답 지원',
    inputSpec: '멀티턴 대화 + FAB 현황 컨텍스트',
    outputSpec: '현장 맞춤 한국어 응답',
    activeVersion: 'v2',
    updatedBy: 'admin',
    updatedAt: '2026-06-10 11:00',
    changeReason: '제약 블록 추가 — 보안·데이터 출처 준수 규칙 명시',
    body: _CHATBOT_V2,
    variables: [],
  },
];

export const MOCK_PROMPT_VERSIONS: AdminPromptVersion[] = [
  {
    id: 'ca-v1',
    templateId: 'CAUSE_ANALYSIS',
    versionNo: 1,
    version: 'v1',
    body: _CAUSE_ANALYSIS_V1,
    updatedAt: '2026-01-15 09:00',
    updatedBy: 'admin',
    changeReason: '프롬프트 기준선 등록 — AI-Agent 연동 기준선',
    status: 'ACTIVE',
  },
  {
    id: 'apc-v1',
    templateId: 'ACTION_PLAN_COMPARE',
    versionNo: 1,
    version: 'v1',
    body: _ACTION_PLAN_COMPARE_V1,
    updatedAt: '2026-01-15 09:00',
    updatedBy: 'admin',
    changeReason: '프롬프트 기준선 등록 — AI-Agent 연동 기준선',
    status: 'PREVIOUS',
  },
  {
    id: 'apc-v2',
    templateId: 'ACTION_PLAN_COMPARE',
    versionNo: 2,
    version: 'v2',
    body: _ACTION_PLAN_COMPARE_V2,
    updatedAt: '2026-06-10 11:00',
    updatedBy: 'admin',
    changeReason: '추천 기준 보강 — tie-breaker chain 명시',
    status: 'ACTIVE',
  },
  {
    id: 'rg-v1',
    templateId: 'REPORT_GEN',
    versionNo: 1,
    version: 'v1',
    body: _REPORT_GEN_V1,
    updatedAt: '2026-01-15 09:00',
    updatedBy: 'admin',
    changeReason: '프롬프트 기준선 등록 — AI-Agent 연동 기준선',
    status: 'PREVIOUS',
  },
  {
    id: 'rg-v2',
    templateId: 'REPORT_GEN',
    versionNo: 2,
    version: 'v2',
    body: _REPORT_GEN_V2,
    updatedAt: '2026-06-10 11:00',
    updatedBy: 'admin',
    changeReason: '보고서 출력 기준 보강 — 출력 형식 및 서술 스타일 제약 명시',
    status: 'ACTIVE',
  },
  {
    id: 'cb-v1',
    templateId: 'CHATBOT',
    versionNo: 1,
    version: 'v1',
    body: _CHATBOT_V1,
    updatedAt: '2026-01-15 09:00',
    updatedBy: 'admin',
    changeReason: '프롬프트 기준선 등록 — AI-Agent 연동 기준선',
    status: 'PREVIOUS',
  },
  {
    id: 'cb-v2',
    templateId: 'CHATBOT',
    versionNo: 2,
    version: 'v2',
    body: _CHATBOT_V2,
    updatedAt: '2026-06-10 11:00',
    updatedBy: 'admin',
    changeReason: '제약 블록 추가 — 보안·데이터 출처 준수 규칙 명시',
    status: 'ACTIVE',
  },
];

function ingestionJob(
  primary: string,
  secondary: string,
  category: string,
  status: AdminResourceItem['status'],
  owner: string,
  lastReceived: string,
  volume: string,
  successRate: string,
  note: string
): AdminResourceItem {
  return {
    id: `ingestion-${primary.toLowerCase().replaceAll('_', '-')}`,
    resourceKey: 'ingestion',
    primary,
    secondary,
    category,
    status,
    owner,
    updatedAt: '2026-06-08T09:48:00Z',
    metrics: [
      { label: '최근 수신', value: lastReceived },
      { label: '수신량', value: volume },
      { label: '성공률', value: successRate },
      { label: '비고', value: note },
    ],
  };
}

function item(
  resourceKey: AdminResourceKey,
  primary: string,
  secondary: string,
  category: string,
  status: AdminResourceItem['status'],
  owner: string,
  metricA: string,
  metricB: string
): AdminResourceItem {
  return {
    id: `${resourceKey}-${primary.toLowerCase().replaceAll(' ', '-')}`,
    resourceKey,
    primary,
    secondary,
    category,
    status,
    owner,
    updatedAt: '2026-06-08T00:10:00Z',
    metrics: [
      { label: '상태값', value: metricA },
      { label: '비고', value: metricB },
    ],
  };
}

function mlModel(
  id: string,
  mlflowRunId: string,
  mlflowVersion: string,
  modelName: string,
  trainedAt: string,
  accuracy: number,
  f1Score: number,
  aucRoc: number,
  trainRowCount: number,
  featureList: string[],
  status: AdminMlModelVersion['status'],
  registeredAt: string
): AdminMlModelVersion {
  return {
    id,
    mlflowRunId,
    mlflowVersion,
    modelName,
    trainedAt,
    accuracy,
    f1Score,
    aucRoc,
    trainRowCount,
    featureList,
    status,
    registeredAt,
  };
}

function driftAlert(
  id: string,
  modelVersionId: string,
  detectedAt: string,
  triggerType: AdminDriftAlert['triggerType'],
  psiScore: number | null,
  f1AtDetection: number | null,
  isRetrainTriggered: boolean,
  retrainTriggeredAt: string | null,
  resultingModelVersionId: string | null
): AdminDriftAlert {
  return {
    id,
    modelVersionId,
    detectedAt,
    triggerType,
    psiScore,
    f1AtDetection,
    isRetrainTriggered,
    retrainTriggeredAt,
    resultingModelVersionId,
  };
}

function accessUser(
  id: string,
  name: string,
  role: AdminAccessUser['role'],
  department: string,
  fabAccess: string,
  lastLogin: string,
  status: AdminAccessUser['status'],
  isActive: boolean
): AdminAccessUser {
  return { userId: id, id, name, role, department, fabAccess, lastLogin, status, isActive };
}

function mesField(
  customerMetricName: string,
  externalField: string,
  internalField: string,
  dataType: AdminMesFieldMapping['dataType'],
  metricScope: AdminMesFieldMapping['metricScope'],
  transformRule: string,
  isRequired: boolean,
  isActive: boolean,
  updatedAt: string
): AdminMesFieldMapping {
  return {
    id: externalField,
    customerMetricName,
    externalField,
    internalField,
    dataType,
    metricScope,
    transformRule,
    isRequired,
    isActive,
    updatedAt,
  };
}

function labelingRule(
  ruleId: string,
  ruleVersion: number,
  versionLabel: string,
  lookaheadMin: number,
  qQuantile: number,
  qMaxQuantile: number,
  wQuantile: number,
  wipQuantile: number,
  aQuantile: number,
  uHiQuantile: number,
  uLoQuantile: number,
  qCut: number | null,
  qMaxCut: number | null,
  wCut: number | null,
  wipCut: number | null,
  aCut: number | null,
  uHiCut: number | null,
  uLoCut: number | null,
  resolvedRunId: string | null,
  resolvedAt: string | null,
  isActive: boolean,
  changeReason: string | null,
  createdAt: string,
  createdBy: string
): AdminLabelingRule {
  return {
    ruleId,
    ruleVersion,
    versionLabel,
    lookaheadMin,
    qQuantile,
    qMaxQuantile,
    wQuantile,
    wipQuantile,
    aQuantile,
    uHiQuantile,
    uLoQuantile,
    qCut,
    qMaxCut,
    wCut,
    wipCut,
    aCut,
    uHiCut,
    uLoCut,
    resolvedRunId,
    resolvedAt,
    isActive,
    changeReason,
    createdAt,
    createdBy,
  };
}
