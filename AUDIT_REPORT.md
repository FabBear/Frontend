# FabBear 프론트엔드 배포 전 감사 보고서

> 생성일: 2026-06-17  
> 최종 수정일: 2026-06-18  
> 범위: 병목 탐지 → 원인 분석 → 대응안 비교 → HITL → 보고서 + FAB 3D / 모니터링 / 대시보드 / 어드민  
> 방식: 코드 감사 + 통합 테스트  

### 수정 완료 항목
- ✅ **C-4** `KpiSparklineChart.vue:57-59` — 빈 배열 Math.min/max Infinity 수정 (`axisValues.length` 가드 추가)
- ✅ **C-1~C-3** `bncService.ts` — fetchBncCases, fetchBncCaseDetail, downloadBncReportPdf try/catch 추가

### 오탐 확인 (수정 불필요)
- IT-C1: MLflow `5500:5000` 포트 매핑은 정상 (호스트:5500 → 컨테이너:5000, MLflow 컨테이너 내부 5000 포트 정상)
- IT-W1: `notificationService.ts`는 이미 `api.put()` 사용 중
- W-1: `formatKoMonthDayTime`은 `MM.DD HH:mm` 포맷 (연도 미표시) → offset 시각적 차이 없음
- W-2: `BncSolutionsKpiCharts`의 `pct`는 `?? 0`으로 number 보장, NaN 발생 안 함

---

---

## 범례

| 아이콘 | 의미 |
|--------|------|
| 🔴 Critical | 런타임 에러 / 화면 깨짐 발생 가능 |
| 🟡 Warning | 잠재적 버그 / 데이터 미표시 / UX 혼동 |
| 🔵 Info | Dead code / 스타일 미완 / 정리 필요 |
| ✅ 정상 | 확인 결과 이상 없음 |

---

## 🔴 Critical

### C-1 · bncService.ts:1121 — fetchBncCases try/catch 없음

```
파일: src/services/bncService.ts
줄:   ~1121
```

`await api.get(...)` 호출이 try-catch 없이 노출됨. API 실패 시 unhandled rejection이 호출 컴포넌트로 전파되어 BncView 전체 로딩 실패.

**수정 방향**: API 호출을 try-catch로 감싸고 에러 throw 또는 빈 목록 반환.

---

### C-2 · bncService.ts:1126 — fetchBncCaseDetail try/catch 없음

```
파일: src/services/bncService.ts
줄:   ~1126
```

케이스 상세 조회 실패 시 예외가 그대로 올라감. 대응센터 케이스 화면 전체가 빈 화면이 될 수 있음.

---

### C-3 · bncService.ts:1160 — downloadBncReportPdf try/catch 없음

```
파일: src/services/bncService.ts
줄:   ~1160
```

PDF 다운로드 실패 시 에러 처리 없음. 사용자에게 피드백 없이 조용히 실패.

---

### C-4 · KpiSparklineChart.vue:58-59 — 빈 배열 Math.min/max → Infinity/-Infinity

```
파일: src/components/dashboard/KpiSparklineChart.vue
줄:   58-59
```

```typescript
const axisMin = Math.min(...axisValues);  // 빈 배열이면 Infinity
const axisMax = Math.max(...axisValues);  // 빈 배열이면 -Infinity
```

KPI 데이터가 없는 초기 로딩 또는 에러 상황에서 `values = []`이면 ECharts에 `Infinity`가 전달되어 차트 렌더링 자체가 깨짐. 대시보드 KPI 차트 화면 오류로 직결.

**수정 방향**: `values.length === 0` 시 조기 반환 또는 기본 range 적용.

---

## 🟡 Warning

### W-1 · BottleneckMonitoringView.vue:89,91 — DEMO_YEAR_OFFSET 미적용

```
파일: src/views/BottleneckMonitoringView.vue
줄:   24, 89, 91
```

시뮬레이션 시간을 `formatKoMonthDayTime()` 로 직접 출력. DEMO_YEAR_OFFSET(+6년)이 적용되지 않아 화면에 표시되는 시각이 2020년대 실제 시뮬레이션 기준으로 표시됨. 다른 화면(BNC 케이스 카드 등)은 +6년 적용 후 표시되므로 모니터링 화면만 시간 불일치.

**영향**: "알림이 2026년에 발생했는데 모니터링 화면은 2020년 시각 표시" — 사용자/데모 혼동.

---

### W-2 · BncSolutionsKpiCharts.vue:16,23 — pctDelta null 시 NaN 렌더링

```
파일: src/components/bnc/tabs/BncSolutionsKpiCharts.vue
줄:   16, 23
```

```typescript
const pct = m.pctDelta ?? 0;
// ...
valueText: pct.toFixed(1)  // m.before / m.after가 파싱 불가면 NaN
```

`m.before`, `m.after` 문자열이 숫자 변환 불가 형식이면 `toFixed()` 결과가 `"NaN"`. ECharts의 `valueText`에 `"NaN"`이 전달되어 KPI 비교 차트에 숫자 대신 "NaN" 텍스트 노출.

---

### W-3 · BncSolutionsKpiCharts.vue:46-47 — confidence null → 0% 오인 표시

```
파일: src/components/bnc/tabs/BncSolutionsKpiCharts.vue
줄:   46-47
```

```typescript
Math.round((plan.confidence ?? 0) * 100)
```

`confidence` 필드가 없는 경우 0% 표시. 실제로 "신뢰도 없음"인데 "신뢰도 0%"로 렌더링되어 사용자가 부정확한 의사결정을 할 수 있음.

---

### W-4 · BncSolutionsHitl.vue:47,88 — defineModel 입력값 유실 위험

```
파일: src/components/bnc/tabs/BncSolutionsHitl.vue
줄:   20-21, 47-49, 87-92
```

`rejectionNote`, `approvalNote`를 `defineModel`로 정의하고 textarea에 v-model 바인딩. 부모(BncSolutionsTab)에서 초기값 설정 없이 승인/반려 확정 이벤트 발생 직후 컴포넌트 상태가 리셋되면, 사용자가 입력한 사유 텍스트가 유실될 수 있음.

---

### W-5 · BncSolutionsTab.vue:86-87 — 초기 렌더링 시 판단 요약 undefined

```
파일: src/components/bnc/tabs/BncSolutionsTab.vue
줄:   86-87
```

`provideBncSolutions(props, emit)`에서 provide된 `decisionSummaryTitle`, `decisionSummaryDescription`이 템플릿에서 직접 사용됨. `props.payload`가 아직 로딩 중일 때 이 값들이 `undefined`이면 빈 문자열 대신 "undefined" 텍스트가 잠깐 노출될 수 있음. (Vue reactivity로 자동 복구되나 초기 깜빡임 발생.)

---

### W-6 · BncView.vue:206-210 — @decide 이벤트 → submitHitlDecision 에러 처리 불명확

```
파일: src/views/BncView.vue
줄:   206-210
```

`BncSolutionsTab`의 `@decide` 이벤트를 받아 `submitHitlDecision()`으로 처리. API 실패 시 이 핸들러가 에러를 컴포넌트에 올바르게 반영하는지(에러 메시지, 버튼 재활성화 등) 확인 필요. `useBncSolutions.ts` 내부 `handleApprove`/`handleRejectConfirm`의 에러 경로가 충분히 검증되지 않음.

---

### W-7 · machineService.ts — paramsSerializer {indexes: null} 검증 필요

```
파일: src/services/machineService.ts
줄:   ~295-305
```

`fetchEquipmentTrends(ids: string[])` 호출 시 `paramsSerializer: { indexes: null }` 사용. axios에서 이 옵션이 `ids=A&ids=B` 형태로 직렬화되는지 실제 네트워크 탭에서 확인 필요. 잘못 직렬화되면 백엔드가 ids를 인식 못하고 빈 결과 반환.

---

## 🔵 Info (Dead code / 정리)

### I-1 · BncTabPlaceholder.vue — BncView에서 미사용

```
파일: src/components/bnc/BncTabPlaceholder.vue
줄:   8-12
```

`BNC_TAB_EMPTY_STATE` 상수를 참조하지만, BncView.vue 템플릿에서 이 컴포넌트를 조건부 렌더링하는 곳이 없음. Dead component.

---

### I-2 · bncCardMetrics.ts — planLabel 함수 미사용

```
파일: src/components/bnc/bncCardMetrics.ts
줄:   ~60-62
```

`export function planLabel(...)` 이 export되어 있으나, BncSolutionsCompareCards.vue 및 기타 컴포넌트 import 목록에 없음. Dead export. `planDisplayLabel`은 사용됨.

---

### I-3 · BncAlertCard.vue:13-16 — selected prop 중복

```
파일: src/components/bnc/BncAlertCard.vue
줄:   13-16
```

`selected?: boolean` prop이 정의되고 내부 BottleneckCaseCard로 전달되지만, 시각적 선택 스타일(배경색, 테두리)은 BncAlertList에서 이미 조건부 클래스로 제어됨. prop 중복으로 혼란.

---

### I-4 · AgentProgressStep.vue:~139 — WAITING 상태 CSS 누락

```
파일: src/components/bnc/AgentProgressStep.vue
줄:   ~139
```

statusMeta computed에서 `mod: 'waiting'`를 반환하지만, 스타일 scoped에 `.agent-step--waiting` 클래스 정의 없음. WAITING/PENDING 상태는 기본 muted 텍스트로만 표시됨 (기능은 동작하지만 시각적 구분 불완전).

---

### I-5 · BncReportTab.vue:18-24 — ai-busy 하드코딩

```
파일: src/components/bnc/tabs/BncReportTab.vue
줄:   18-24
```

BncView에서 `ai-busy="false"`로 하드코딩 전달. AI 채팅 로딩 중에도 항상 false. BottleneckReportPanel의 AI 요청 버튼이 로딩 상태를 표시하지 않음 (기능은 동작하나 UX 피드백 없음).

---

## ✅ 정상 확인

| 항목 | 파일 | 확인 결과 |
|------|------|----------|
| 라우터 route ↔ view 일치 | router/index.ts | 전체 일치 |
| auth guard (requiresAuth) | router/index.ts | 모든 보호 라우트 적용 |
| lazy import 경로 | router/index.ts | 전체 유효 |
| Pinia auth 스토어 에러 처리 | stores/auth.ts | try-catch + mock 폴백 완비 |
| EventSource 해제 | notificationService.ts, mesService.ts | `eventSource.close()` 완비 |
| isCompareV2Payload 판별 로직 | bncService.ts:661-671 | `schema_version` + `action_options` 조건 정확 |
| isCompareAgentPayload 판별 | bncService.ts:673-675 | `action_effects` 배열 조건 정확 |
| 분기 호출 순서 | bncService.ts:1139-1141 | V2 → Agent → fallback 순서 정확 |
| mapper 함수 전체 호출 여부 | dashboardMapper.ts, bottleneckMonitoringMapper.ts | 모두 실제 호출됨 |
| bncRagHelpers 함수 전체 사용 | bncRagHelpers.ts | ragScoreVariant 등 5종 모두 사용됨 |
| Fab3dToolGroupDetail props 전달 | Fab3dView.vue:674-701 | 24개 props 전부 일치 |
| Fab3dToolBoard :key 초기화 | Fab3dView.vue:514 | `:key="selectedTg.tgId"` 재초기화 정상 |
| WebGL context 해제 | Fab3dView.vue:229-249 | renderer/controls/geometry/material 모두 dispose() |
| snapshot ↔ 실시간 전환 상태 정리 | Fab3dView.vue:492-496 | `watch(requestedCaseId)` → `closeDetail()` |
| BncCauseTab null 체크 | BncCauseTab.vue:338 | gStar null guard 적절 |
| BncCauseTab 빈 배열 처리 | BncCauseTab.vue:218 | `v-if="categories.length"` 적절 |
| BncStatBarChart 역순 인덱스 | BncStatBarChart.vue:60-62 | items.reverse() ↔ dataIndex 매핑 일치 |
| AgentProgressStep 상태 전체 처리 | AgentProgressStep.vue | PENDING/IN_PROGRESS/RUNNING/DONE/FAILED 모두 처리 |
| chatbot SSE 에러 처리 | chatbotService.ts:276 | `res.ok && res.body` 이중 검사 |
| chatbot pagination 루프 | chatbotService.ts:84-136 | 전체 페이지 루프 정상 |
| Fab3d Promise.all 병렬 호출 | fab3dService.ts:363-364 | 정상 |

---

## 우선순위 정리

### 즉시 수정 (배포 전 필수)

1. **C-4** — KpiSparklineChart 빈 배열 Math.min/max → Infinity
2. **C-1 ~ C-3** — bncService 3개 함수 try-catch 추가
3. **W-1** — BottleneckMonitoringView DEMO_YEAR_OFFSET 적용
4. **W-2** — BncSolutionsKpiCharts NaN 렌더링

### 배포 후 개선 권장

5. **W-3** — confidence null 표시 개선 ("측정 불가" 등)
6. **W-4** — HITL defineModel 입력값 보호
7. **W-7** — machineService paramsSerializer 실제 네트워크 확인
8. **I-1 ~ I-5** — Dead code 정리

---

---

# 서비스 통합 테스트 보고서

> 범위: 프론트엔드 서비스 호출 기준 → 백엔드(Spring Boot) → AI-Agent(FastAPI) → DB(PostgreSQL/TimescaleDB) → ML(MLflow) → 알림 전체 스택  
> 환경: DB/ML = Docker, Spring Boot/AI-Agent = 로컬 실행  

---

## IT-🔴 Critical

### IT-C1 · backend/compose.yaml:44 — MLflow 포트 매핑 오류

```
파일: backend/compose.yaml
줄:   ~44
```

```yaml
# 현재 (잘못됨)
ports: - '${MLFLOW_PORT:-5500}:5000'
command: mlflow server --port 5000

# compose.yaml는 올바름
ports: - '${MLFLOW_PORT:-5500}:5500'
command: mlflow server --port 5500
```

`backend/compose.yaml`로 MLflow를 띄우면 컨테이너 내부 5000포트 → 호스트 5500 매핑이지만, AI-Agent는 `http://localhost:5500`으로 접근하므로 연결 성공처럼 보여도 실제 MLflow 서버와 통신 안 됨. 결과: 모델 로드 실패 → 병목 예측 불가.

**수정**: `backend/compose.yaml`의 `5500:5000` → `5500:5500`, `--port 5000` → `--port 5500`.

---

### IT-C2 · spring_client.py:86 — `/api/internal/notification` 백엔드 핸들러 없음

```
파일: AI-Agent/app/services/spring_client.py
줄:   86
```

AI-Agent에서 병목 탐지 후 알림을 트리거하기 위해 `POST /api/internal/notification` 호출 메서드가 정의되어 있으나, 백엔드 내부 컨트롤러(`InternalSnapshotController`)에 이 경로 핸들러 없음 → **404**.  
(백엔드 `/api/internal/*` 4개: agent-step ✅, snapshot ✅, ml-predictions ✅, agent-hitl/pending ✅ — notification만 누락.)

**영향**: 알림 전송 코드가 호출되는 시점에 404 에러 발생. 현재 send_notification 메서드가 실제로 호출되는 코드 경로가 명확하지 않아 무증상일 수 있으나, 알림 기능 사용 시 바로 터짐.

---

## IT-🟡 Warning

### IT-W1 · NotificationController.java:54 — `POST /v1/notifications/read` → 백엔드는 `PUT`

```
파일: backend/.../notification/controller/NotificationController.java
줄:   54
프론트: src/services/notificationService.ts
```

프론트엔드가 `POST /v1/notifications/read`를 호출하지만 백엔드는 `PUT /v1/notifications/read`로 정의됨. 405 Method Not Allowed 에러 발생 → 알림 읽음 처리 불가.

---

### IT-W2 · `GET /v1/monitoring/equipment/stream` (SSE) — 백엔드 미구현

```
파일: backend/.../monitoring/realtime/controller/MonitoringRealtimeController.java
```

설비 실시간 스트리밍 SSE 엔드포인트가 프론트엔드 서비스에 정의되어 있으나 MonitoringRealtimeController에 해당 경로 없음. (MES 스트림 `/v1/monitoring/mes/stream`은 구현됨.) 설비 실시간 화면이 SSE를 시도하면 404.

---

### IT-W3 · PromptAdminController — `POST/PUT/DELETE /v1/admin/prompts` 미구현

```
파일: backend/.../opsconfig/controller/PromptAdminController.java
프론트: src/services/adminService.ts
```

프론트엔드 어드민 화면이 프롬프트 CRUD를 `POST/PUT/DELETE /v1/admin/prompts`로 호출하지만, 백엔드에는 `GET /v1/admin/prompts`와 `PUT /v1/admin/prompts/{category}/versions` 구조만 존재. 경로 구조 상이 → 쓰기 작업 전부 404.  
참고: 기존 메모리에서 "프롬프트 관리 화면은 표시 전용, 실제 AI-Agent 프롬프트는 파이썬 코드에 하드코딩" 으로 기록됨 — 현재 백엔드 구현과 일치.

---

### IT-W4 · LabelingRuleAdminController — `PUT/DELETE /v1/admin/labeling-rules` 미구현

```
파일: backend/.../opsconfig/controller/LabelingRuleAdminController.java
```

라벨링 룰 수정(PUT)·삭제(DELETE) 엔드포인트 없음. 어드민 화면에서 룰 수정/삭제 시 404.

---

### IT-W5 · HTTP 메서드 불일치 (PUT vs PATCH)

| 경로 | 프론트 예상 | 백엔드 구현 | 파일 |
|------|-----------|-----------|------|
| `/v1/admin/access/users/{userId}` | PUT | PATCH | AccessAdminController.java:44 |
| `/v1/admin/mes/mappings/{mappingId}` | PUT | PATCH | MesFieldMappingController.java:45 |

axios는 기본적으로 PUT/PATCH 구분이 엄격하지 않지만 REST 클라이언트·프록시에서 405 반환 가능.

---

### IT-W6 · MLflow 모델 미등록 시 AI-Agent 기동 실패

```
파일: AI-Agent/app/services/predict_service.py
설정: MLFLOW_MODEL_NAME=FabGuard_Bottleneck_Model, MLFLOW_MODEL_STAGE=production
```

통합 테스트 전 MLflow에 `FabGuard_Bottleneck_Model@production` 모델이 등록되어 있지 않으면 `PredictService._load_model()` 호출 시 MlflowException. 병목 탐지 파이프라인 전체가 예측 단계에서 실패.

**확인 명령**: `http://localhost:5500` → Models 탭 → `FabGuard_Bottleneck_Model` 존재 여부.

---

### IT-W7 · CORS — 프로덕션 배포 시 `localhost:5173`만 허용

```
파일: backend/src/main/resources/application.yml
```

CORS 허용 origin이 `http://localhost:5173` (Vite 개발 서버)로만 설정됨. 도커 기반 프로덕션 배포(`http://localhost:80` 또는 실 도메인)에서 CORS 에러.

---

### IT-W8 · `GET /v1/response-center/cases/{caseId}/fab-snapshot` 확인 필요

```
프론트: src/services/fab3dService.ts
백엔드: BncController.java (7개 엔드포인트 확인, fab-snapshot 미확인)
```

프론트엔드가 케이스 기준 FAB 3D 스냅샷을 요청하는 이 경로가 BncController에 포함되는지 확인 중. 에이전트 검사에서 BncController 7개 엔드포인트만 확인되었고 `fab-snapshot`은 목록에 없음. 404 가능성 있음.

---

## IT-🔵 Info

### IT-I1 · backend/compose.yaml:MLFLOW_TRACKING_URI — 백엔드 설정도 포트 오류

```
파일: backend/compose.yaml (environment 섹션)
```

`MLFLOW_TRACKING_URI: http://mlflow:5000`으로 설정되어 있으나 컨테이너 이름 `mlflow`가 5500 포트로 노출되어야 하므로 `http://mlflow:5500`이 맞음 (IT-C1과 연계).

---

### IT-I2 · Jenkins depends_on — Spring 기동 블로킹

```
파일: compose.yaml (services.spring.depends_on)
```

Spring 서비스가 Jenkins를 `depends_on`으로 의존. 로컬 개발 시 Jenkins 없이 Spring만 올리면 compose가 Jenkins도 함께 시작하려 시도. 개발 환경에서는 Jenkins 의존성 제거 권장.

---

### IT-I3 · MLFLOW_MODEL_STAGE 대소문자 불일치

```
파일: AI-Agent/app/config.py (기본값: "Production")
      compose.yaml (환경변수: "production")
```

`PredictService`에서 `.lower()` 처리로 런타임 이슈는 없으나 설정 값 통일 필요.

---

### IT-I4 · Qdrant 컬렉션 이름 주석 처리

```
파일: AI-Agent/.env
줄:   # QDRANT_COLLECTION_CASES: bottleneck_cases_demo_3780
```

초기 실행 시 Qdrant 컬렉션이 없으면 RAG 검색 실패. 초기화 스크립트 및 컬렉션 이름 확인 필요.

---

## 통합 테스트 환경 구동 순서

```bash
# 1. DB + MLflow + Qdrant 도커 기동
docker compose -f compose.yaml up fabbear-db mlflow qdrant -d
# MLflow 모델 등록 확인: http://localhost:5500

# 2. 로컬 Spring Boot 기동
export AGENT_BASE_URL=http://localhost:8000
export MLFLOW_TRACKING_URI=http://localhost:5500
cd backend && ./gradlew bootRun --args='--spring.profiles.active=dev'

# 3. 로컬 AI-Agent 기동
cd AI-Agent && uvicorn app.main:app --reload --port 8000

# 4. 로컬 프론트 기동
cd fabBear_frontend && npm run dev
```

---

## 통합 테스트 이슈 요약

| ID | 경로/설정 | 심각도 | 현상 | 수정 위치 |
|----|---------|--------|------|---------|
| IT-C1 | backend/compose.yaml MLflow 포트 | 🔴 | 모델 로드 실패 | compose.yaml L44 |
| IT-C2 | /api/internal/notification | 🔴 | 알림 콜백 404 | 백엔드 internal 컨트롤러 추가 |
| IT-W1 | POST vs PUT /notifications/read | 🟡 | 읽음처리 405 | 프론트 메서드 수정 또는 백엔드 추가 |
| IT-W2 | /monitoring/equipment/stream | 🟡 | 설비 SSE 404 | 백엔드 SSE 엔드포인트 구현 |
| IT-W3 | POST/PUT/DELETE /admin/prompts | 🟡 | 프롬프트 쓰기 404 | 어드민 화면 읽기전용 처리 또는 백엔드 구현 |
| IT-W4 | PUT/DELETE /admin/labeling-rules | 🟡 | 룰 수정/삭제 404 | 백엔드 엔드포인트 추가 |
| IT-W5 | PUT vs PATCH (users, mes mappings) | 🟡 | 메서드 불일치 | 프론트 또는 백엔드 통일 |
| IT-W6 | MLflow 모델 미등록 | 🟡 | 예측 파이프라인 중단 | MLOps 파이프라인 실행 필수 |
| IT-W7 | CORS origin 설정 | 🟡 | 프로덕션 CORS 오류 | application.yml 환경별 분리 |
| IT-W8 | /response-center/*/fab-snapshot | 🟡 | 404 가능 | BncController 확인 필요 |
| IT-I1 | backend/compose MLFLOW_TRACKING_URI | 🔵 | IT-C1 연계 | backend/compose.yaml |
| IT-I2 | Jenkins depends_on | 🔵 | 불필요 의존성 | compose.yaml |
| IT-I3 | MLFLOW_MODEL_STAGE 대소문자 | 🔵 | 설정 혼란 | config.py |
| IT-I4 | Qdrant 컬렉션 이름 미설정 | 🔵 | RAG 실패 가능 | .env 확인 |
