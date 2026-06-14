import type {
  AdminAccessUser,
  AdminDriftAlert,
  AdminMesFieldMapping,
  AdminMlModelVersion,
  AdminPromptTemplate,
  AdminPromptVersion,
  AdminResourceItem,
  AdminResourceKey,
  AdminResourceMeta,
  AdminThresholdConfig,
  AdminThresholdHistory,
} from '@/types/admin';

export const ADMIN_RESOURCE_META: Record<AdminResourceKey, AdminResourceMeta> = {
  thresholds: {
    key: 'thresholds',
    title: '임계값 관리',
    description: '공장 단위 병목·KPI·대응 임계값의 현재값을 조회합니다.',
    primaryLabel: '설정 키',
    secondaryLabel: '분류',
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
    '활성 v3',
    'tm_prompt_template',
    'NORMAL',
    '박관리자',
    '변경 사유: G* 지시문 톤 개선',
    '변수 검증 통과'
  ),
  item(
    'prompts',
    'SOLUTION_EXPLAIN',
    '활성 v2',
    'tm_prompt_template',
    'NORMAL',
    '박관리자',
    '변경 사유: 출력 형식 보완',
    '변수 검증 통과'
  ),
  item(
    'prompts',
    'COMPARE_RANK',
    '활성 v1',
    'tm_prompt_template',
    'NORMAL',
    'admin',
    '변경 사유: 초기 버전',
    '변수 검증 통과'
  ),
  item(
    'prompts',
    'REPORT_GEN',
    '활성 v2',
    'tm_prompt_template',
    'NORMAL',
    '박관리자',
    '변경 사유: 도메인 지식 섹션 추가',
    '변수 검증 통과'
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

export const MOCK_THRESHOLD_CONFIGS: AdminThresholdConfig[] = [
  config('BOTTLENECK', 'bottleneck.prob_threshold_critical', '0.90', 'FLOAT', 'CRITICAL 판정 최소 확률', '확률'),
  config('BOTTLENECK', 'bottleneck.prob_threshold_high', '0.70', 'FLOAT', 'HIGH 판정 최소 확률', '확률'),
  config('BOTTLENECK', 'ml.alarm_probability_threshold', '0.70', 'FLOAT', 'ML 알람 발생 확률 기준', '확률'),
  config('BOTTLENECK', 'label.q_time_min_threshold', '30', 'FLOAT', '시뮬레이션 Q-time 라벨 기준', '분'),
  config('BOTTLENECK', 'label.wait_ratio_threshold', '1.0', 'FLOAT', '시뮬레이션 대기 비율 라벨 기준', '비율'),
  config('BOTTLENECK', 'label.utilization_high_threshold', '0.80', 'FLOAT', '시뮬레이션 고가동 라벨 기준', '비율'),
  config('KPI', 'WIP_UPPER_LIMIT', '50', 'INT', '대시보드 WIP 목표 상한', 'lots'),
  config('KPI', 'kpi.qtime_warn_min', '120', 'INT', 'Q-time 경고 임계값', '분'),
  config('KPI', 'kpi.utilization_warn', '0.85', 'FLOAT', '가동률 경고 임계값', '비율'),
  config('KPI', 'kpi.wip_warn_count', '50', 'INT', 'WIP 경고 임계값', 'lots'),
  config('ACTION_RULE', 'action.max_plan_count', '3', 'INT', '대응안 최대 후보 수', '개'),
  config('ACTION_RULE', 'action.agent_sync_timeout_sec', '5', 'INT', 'Agent HITL 동기화 timeout', '초'),
];

export const MOCK_THRESHOLD_HISTORY: AdminThresholdHistory[] = [
  {
    changedAt: '2026-05-06 09:30',
    itemName: 'kpi.utilization_warn',
    before: '0.80',
    after: '0.85',
    changedBy: 'admin',
  },
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
  driftAlert('drift-001', 'mv-004', '2026-06-08 09:20', 'PSI', 0.218, 0.879, true, '2026-06-08 09:35', 'mv-005'),
  driftAlert('drift-002', 'mv-004', '2026-06-07 18:00', 'F1', 0.142, 0.841, false, null, null),
  driftAlert('drift-003', 'mv-003', '2026-06-03 11:30', 'PSI', 0.263, 0.816, true, '2026-06-03 12:05', 'mv-004'),
];

export const MOCK_ACCESS_USERS: AdminAccessUser[] = [
  accessUser('admin', '관리자', 'ADMIN', '운영관리', 'SK하이닉스 Demo FAB', '2026-06-08 09:20', 'ACTIVE', true),
  accessUser(
    'engineer01',
    '공정 엔지니어',
    'ENGINEER',
    '공정팀',
    'SK하이닉스 Demo FAB',
    '2026-06-08 09:18',
    'ACTIVE',
    true
  ),
];

export const MOCK_MES_FIELD_MAPPINGS: AdminMesFieldMapping[] = [
  mesField('FAB 코드', 'FAB_ID', 'fab_code', 'STRING', 'FAB', '-', true, true, '2026-06-08'),
  mesField('장비 ID', 'TOOL_ID', 'tool_id', 'STRING', 'TOOL', '-', true, true, '2026-06-08'),
  mesField(
    '장비 상태',
    'STAT',
    'status',
    'ENUM',
    'TOOL',
    'PROC→PROCESSING, IDLE→IDLE, SU→SETUP',
    true,
    true,
    '2026-06-08'
  ),
  mesField(
    '가동률',
    'UTIL',
    'utilization_rate',
    'NUMBER',
    'TOOL_GROUP',
    '0~100 입력 시 /100',
    false,
    true,
    '2026-06-08'
  ),
  mesField('대기 Lot', 'Q_LOT', 'waiting_lot', 'NUMBER', 'TOOL_GROUP', '-', false, true, '2026-06-08'),
];

const _CAUSE_ANALYSIS_V3 = `당신은 반도체 FAB 병목 원인 분석 전문가입니다. 반드시 한국어로만 답변하세요.

아래 데이터를 참고해서 '{toolgroup}' 공정의 병목 원인을 분석하세요.
반드시 아래 4개 항목만 출력하세요. 입력 데이터를 그대로 복사하지 마세요.
데이터가 없는 항목은 생략하세요. 각 항목은 1~2문장으로 작성하세요.

--- 참고 데이터 ---
[SHAP 기여도 상위]
{shap_text}

[KPI 트렌드]
{trend_text}
{upstream_section}
{forecast_section}
{consensus_section}
--- 참고 데이터 끝 ---

출력 형식:
[주요 원인] (원인 1~2문장, G* 결과 수치 포함)
[악화 추세] (트렌드 1~2문장)
[업스트림] (있을 때만)
[2시간 전망] (있을 때만)`;

const _SOLUTION_EXPLAIN_V2 = `당신은 반도체 FAB 운영 전문가입니다. 반드시 한국어로만 답변하세요.

[Lot Release 테이블 조정안 — 플랜 {plan_id}]
- Release Interval: {release_interval}분
- 투입 우선순위: {lot_priority_rule}
- SUPERHOTLOT: {superhotlot_enable}

Critical 병목 TG 및 원인 요약:
{tg_lines}

이 파라미터로 시뮬레이션 실행 시 아래 두 가지를 2~3문장으로 요약하세요.
1. 기대 효과 (WIP / wait_ratio / Cycle Time 개선 관점)
2. 주의사항 또는 부작용

답변:`;

const _COMPARE_RANK_V1 = `[역할]
당신은 반도체 FAB 공정 병목 대응 의사결정을 지원하는 AI입니다.
여러 대응안(A/B/C)의 시뮬레이션 KPI 비교 결과를 바탕으로,
공정 관리자가 즉시 판단할 수 있는 추천 근거를 작성합니다.

[독자]
- 반도체 FAB 공정 관리자, 생산 엔지니어
- WIP · Q-time · CQT · CR · REQUEUE_TOOL · LOT_HOLD 등 FAB 용어에 익숙함

[작성 원칙]
1. 반드시 한국어로 작성합니다. FAB 용어(REQUEUE_TOOL 등)는 원문 유지.
2. 제공된 수치는 반드시 그대로 사용합니다. 반올림·단위 변환 금지.
3. 데이터에 없는 내용은 절대 추측하지 않습니다.
4. 문체는 "~됨", "~함", "~임"으로 통일합니다.
5. 2~3문장 이내로 작성합니다.`;

const _REPORT_GEN_V2 = `[역할]
당신은 반도체 FAB 공정 병목 대응 의사결정 보고서를 작성하는 전문 AI입니다.
병목 감지 · 원인 분석 · 대응안 생성 · 효과 검증 · 비교 분석을 수행한
5개 AI Agent의 결과를 종합하여, 공정 관리자가 즉시 판단하고 행동할 수 있는
최종 보고서를 작성합니다.

[독자]
- 반도체 FAB 공정 관리자, 생산 엔지니어
- WIP · Q-time · CQT · CT · TH · Load Ratio · CR · SHAP · SuperHotLot ·
  Dispatch Rule 등 FAB 공정 용어에 익숙합니다
- 병목 발생 시 빠른 의사결정이 필요하므로 핵심 수치와 근거 중심으로 판단합니다
- 모호한 표현을 신뢰하지 않으며, 데이터에 기반한 명확한 서술을 요구합니다

[도메인 지식 — 이 기준으로 데이터를 해석하세요]
risk_score 등급 (= 대기시간 30 + 부하 30 + 처리량갭 25 + 확산위험 15):
  · 정상   : 25 이하
  · MEDIUM : 26~47  → 주의 필요
  · HIGH   : 47~60  → 비정상 진입, 즉각 모니터링
  · CRITICAL: 60 이상 → 즉시 대응 필요

Load Ratio 해석:
  · < 0.75       : 여유 있음
  · 0.75 ~ 0.90  : 주의
  · 0.90 ~ 1.00  : capacity 여유 낮음
  · > 1.00       : 과부하 / 2차 병목 가능

원인 후보 분류:
  · machine_downtime   : 장비 정지 · 비가동 영향
  · setup_overhead     : setup 전환 부담 증가
  · upstream_overload  : 앞 공정에서 유입량 증가
  · capacity_saturation: 처리 능력 포화
  · queue_buildup      : 일반적인 큐 적체

[작성 원칙]
1. 반드시 한국어로 작성합니다.
   단, 장비명(예: Diffusion_FE_120) · KPI 지표명(WIP · Q-time · CT · TH) ·
   Lot명 · 대응안 종류(REQUEUE_TOOL 등)는 원문 그대로 유지합니다.
2. 제공된 수치는 반드시 그대로 사용합니다.
   반올림 · 단위 변환 · 재계산 금지. (45.2% → "약 45%" 금지, 180분 → "3시간" 금지)
3. 데이터에 없는 내용은 절대 추측하거나 창작하지 않습니다.
   없는 항목은 "-"로 표시합니다.
4. 객관적 · 사실 기반 문장으로 작성합니다.
   "아마도" · "가능성이 있습니다" 같은 모호한 표현은 금지합니다.
   단, 시뮬레이션 기반 예측값을 서술할 때는 "시뮬레이션 기준" 또는 "예측값"임을 명시합니다.
5. 능동태와 단문을 사용합니다. 한 문장은 최대 두 줄을 넘지 않습니다.
6. 서론 · 결론 · 부연 설명은 추가하지 않습니다.
7. 문체는 "~됨", "~함", "~임"으로 통일합니다. (~습니다 · ~이다 · ~합니다 금지)

[출력 규칙]
- Markdown 형식만 출력합니다.
- 출력 앞뒤에 "다음은 보고서입니다" · "이상으로 마칩니다" 등의 문장을 붙이지 않습니다.
- \`\`\`markdown 코드블록으로 감싸지 않습니다.
- 지시된 섹션 구조 외에 임의로 섹션을 추가하거나 삭제하지 않습니다.
- 표의 컬럼명과 순서는 지시된 형식 그대로 유지합니다.

[금지 사항]
- 데이터에 없는 원인 · 수치 · 대응안 창작 금지
- 수치 변경 · 단위 변환 금지
- 영어와 한국어 혼용 금지 (지정된 FAB 용어 제외)
- 지시된 형식 이외의 내용 추가 금지`;

export const MOCK_PROMPT_TEMPLATES: AdminPromptTemplate[] = [
  {
    id: 'CAUSE_ANALYSIS',
    label: '원인 분석',
    activeVersion: 'v3',
    updatedBy: '박관리자',
    updatedAt: '2026-05-09 11:20',
    changeReason: 'G* 지시문 톤 개선',
    body: _CAUSE_ANALYSIS_V3,
    variables: [
      { token: '{toolgroup}', description: '병목 Tool Group 공정명' },
      { token: '{shap_text}', description: 'SHAP 기여도 상위 Feature 목록' },
      { token: '{trend_text}', description: 'KPI 시계열 트렌드 요약' },
      { token: '{upstream_section}', description: '업스트림 과부하 공정 (선택적)' },
      { token: '{forecast_section}', description: '2시간 후 시뮬레이션 예측 (선택적)' },
      { token: '{consensus_section}', description: 'G* 분석 간 합의 결과 (선택적)' },
    ],
  },
  {
    id: 'SOLUTION_EXPLAIN',
    label: '대응안 설명',
    activeVersion: 'v2',
    updatedBy: '박관리자',
    updatedAt: '2026-05-12 09:45',
    changeReason: '출력 형식 보완',
    body: _SOLUTION_EXPLAIN_V2,
    variables: [
      { token: '{plan_id}', description: '글로벌 대응 플랜 ID' },
      { token: '{release_interval}', description: 'Lot Release 간격 (분)' },
      { token: '{lot_priority_rule}', description: '투입 우선순위 규칙' },
      { token: '{superhotlot_enable}', description: 'SUPERHOTLOT 활성화 여부' },
      { token: '{tg_lines}', description: 'Critical 병목 TG 및 원인 요약' },
    ],
  },
  {
    id: 'COMPARE_RANK',
    label: '비교 추천',
    activeVersion: 'v1',
    updatedBy: 'admin',
    updatedAt: '2026-04-01 10:00',
    changeReason: '초기 버전',
    body: _COMPARE_RANK_V1,
    variables: [
      { token: '{process_name}', description: '병목 공정명' },
      { token: '{severity}', description: '심각도 등급 (CRITICAL/HIGH/MEDIUM)' },
      { token: '{candidates}', description: 'A/B/C 대응안 시뮬레이션 KPI 비교 데이터' },
      { token: '{top_label}', description: '추천 대응안 라벨' },
      { token: '{recommendation_reason}', description: '추천 근거 (rank 기준)' },
    ],
  },
  {
    id: 'REPORT_GEN',
    label: '최종 보고서',
    activeVersion: 'v2',
    updatedBy: '박관리자',
    updatedAt: '2026-05-20 14:30',
    changeReason: '도메인 지식 섹션 추가',
    body: _REPORT_GEN_V2,
    variables: [
      { token: '{process_name}', description: '병목 공정명' },
      { token: '{severity}', description: '심각도 등급' },
      { token: '{bottleneck_info}', description: '병목 KPI 스냅샷 (risk_score, WIP 등)' },
      { token: '{diffusion_analysis}', description: '확산 영향 분석 결과' },
      { token: '{cause_analysis}', description: '원인 분석 TOP 3' },
      { token: '{action_effects}', description: '대응안 A/B/C 시뮬레이션 효과' },
      { token: '{approval_info}', description: 'HITL 승인/반려 정보' },
    ],
  },
];

export const MOCK_PROMPT_VERSIONS: AdminPromptVersion[] = [
  {
    id: 'ca-v1',
    templateId: 'CAUSE_ANALYSIS',
    version: 'v1',
    body: `당신은 반도체 FAB 공정 분석 전문가입니다. 반드시 한국어로만 답변하세요.\n\n아래 데이터를 참고해서 '{toolgroup}' 공정의 병목 원인을 분석하세요.\n\n[SHAP 기여도 상위]\n{shap_text}\n\n[KPI 트렌드]\n{trend_text}\n\n출력 형식:\n[주요 원인]\n[악화 추세]`,
    updatedAt: '2026-03-10 09:00',
    updatedBy: 'admin',
    changeReason: '초기 버전',
    status: 'PREVIOUS',
  },
  {
    id: 'ca-v2',
    templateId: 'CAUSE_ANALYSIS',
    version: 'v2',
    body: `당신은 반도체 FAB 병목 원인 분석 전문가입니다. 반드시 한국어로만 답변하세요.\n\n아래 데이터를 참고해서 '{toolgroup}' 공정의 병목 원인을 분석하세요.\n각 항목은 1~2문장으로 작성하세요.\n\n[SHAP 기여도 상위]\n{shap_text}\n[KPI 트렌드]\n{trend_text}\n{upstream_section}\n{forecast_section}\n\n출력 형식:\n[주요 원인]\n[악화 추세]\n[업스트림] (있을 때만)\n[2시간 전망] (있을 때만)`,
    updatedAt: '2026-04-15 14:30',
    updatedBy: '박관리자',
    changeReason: '업스트림·전망 항목 추가',
    status: 'PREVIOUS',
  },
  {
    id: 'ca-v3',
    templateId: 'CAUSE_ANALYSIS',
    version: 'v3',
    body: _CAUSE_ANALYSIS_V3,
    updatedAt: '2026-05-09 11:20',
    updatedBy: '박관리자',
    changeReason: 'G* 지시문 톤 개선',
    status: 'ACTIVE',
  },
  {
    id: 'se-v1',
    templateId: 'SOLUTION_EXPLAIN',
    version: 'v1',
    body: `당신은 반도체 FAB 운영 전문가입니다. 반드시 한국어로만 답변하세요.\n\n[Lot Release 조정안 — 플랜 {plan_id}]\n- Release Interval: {release_interval}분\n- SUPERHOTLOT: {superhotlot_enable}\n\n{tg_lines}\n\n기대 효과와 주의사항을 요약하세요.\n\n답변:`,
    updatedAt: '2026-04-20 10:00',
    updatedBy: 'admin',
    changeReason: '초기 버전',
    status: 'PREVIOUS',
  },
  {
    id: 'se-v2',
    templateId: 'SOLUTION_EXPLAIN',
    version: 'v2',
    body: _SOLUTION_EXPLAIN_V2,
    updatedAt: '2026-05-12 09:45',
    updatedBy: '박관리자',
    changeReason: '출력 형식 보완',
    status: 'ACTIVE',
  },
  {
    id: 'cr-v1',
    templateId: 'COMPARE_RANK',
    version: 'v1',
    body: _COMPARE_RANK_V1,
    updatedAt: '2026-04-01 10:00',
    updatedBy: 'admin',
    changeReason: '초기 버전',
    status: 'ACTIVE',
  },
  {
    id: 'rg-v1',
    templateId: 'REPORT_GEN',
    version: 'v1',
    body: `[역할]\n당신은 반도체 FAB 공정 병목 대응 보고서를 작성하는 전문 AI입니다.\n\n[작성 원칙]\n1. 반드시 한국어로 작성합니다.\n2. 제공된 수치는 반드시 그대로 사용합니다.\n3. 데이터에 없는 내용은 추측하지 않습니다.\n4. 문체는 "~됨", "~함", "~임"으로 통일합니다.\n\n[출력 규칙]\n- Markdown 형식만 출력합니다.`,
    updatedAt: '2026-04-01 10:00',
    updatedBy: 'admin',
    changeReason: '초기 버전',
    status: 'PREVIOUS',
  },
  {
    id: 'rg-v2',
    templateId: 'REPORT_GEN',
    version: 'v2',
    body: _REPORT_GEN_V2,
    updatedAt: '2026-05-20 14:30',
    updatedBy: '박관리자',
    changeReason: '도메인 지식 섹션 추가',
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

function config(
  category: AdminThresholdConfig['category'],
  configKey: string,
  configValue: string,
  valueType: AdminThresholdConfig['valueType'],
  description: string,
  unit = ''
): AdminThresholdConfig {
  return {
    id: configKey,
    category,
    configKey,
    configValue,
    valueType,
    description,
    unit,
    updatedBy: 'admin',
    updatedAt: '2026-06-08T00:10:00Z',
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
  return { id, name, role, department, fabAccess, lastLogin, status, isActive };
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
