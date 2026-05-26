# fabBEAR Frontend

제조 공정에서 발생하는 병목을 AI Agent가 조기에 감지하고, 원인 분석부터 대응안 검증·리포트 생성까지 자동화해 생산계획 변경의 리스크와 손실을 최소화하는 서비스입니다.

<br/>

## Tech Stack

| 분류             | 기술                    |
| ---------------- | ----------------------- |
| Framework        | Vue 3 (Composition API) |
| Language         | TypeScript              |
| Build Tool       | Vite                    |
| Routing          | Vue Router              |
| State Management | Pinia                   |
| HTTP Client      | Axios                   |
| Testing          | Vitest, @vue/test-utils |
| Linting          | ESLint, Prettier        |
| Git Hooks        | Husky, lint-staged      |

<br/>

## Project Structure

```
src/
├── assets/        # 이미지, 폰트 등 정적 리소스
├── components/    # 재사용 가능한 컴포넌트
├── composables/   # 재사용 가능한 로직 (useXxx 형태)
├── constants/     # 상수
├── router/        # Vue Router 설정
├── services/      # API 호출 모듈
├── stores/        # Pinia 전역 상태
├── styles/        # 전역 스타일
├── types/         # TypeScript 타입 정의
└── views/         # 라우트 단위 페이지 컴포넌트
```

<br/>

## Branch Strategy

```
main              ← 배포 브랜치
 └─ dev           ← 개발 통합 브랜치
     └─ feat/#12-login   ← 기능 단위 작업 브랜치
```

브랜치 이름은 `타입/#이슈번호-설명` 형식으로 작성합니다.

<br/>

## Commit Convention

```
[타입] #이슈번호 작업 내용 요약
```

| 타입         | 설명                     |
| ------------ | ------------------------ |
| `[FEAT]`     | 새로운 기능 추가         |
| `[ADD]`      | 파일, 의존성 추가        |
| `[MODIFY]`   | 기능 수정 또는 변경      |
| `[FIX]`      | 버그 수정                |
| `[STYLE]`    | UI/UX, 스타일링          |
| `[REFACTOR]` | 코드 리팩토링            |
| `[PERF]`     | 성능 개선                |
| `[TEST]`     | 테스트 코드 작성 및 수정 |
| `[DOCS]`     | 문서 수정                |
| `[CHORE]`    | 빌드, 패키지 관리 등     |
| `[SETTING]`  | 프로젝트 설정            |
| `[RENAME]`   | 파일·변수명 변경         |
| `[REMOVE]`   | 파일·코드 삭제           |

**예시**

```
[FEAT] #12 로그인 페이지 구현
[FIX] #34 토큰 만료 시 리다이렉트 오류 수정
```

<br/>

## PR Convention

PR 제목은 커밋 타입과 동일한 prefix를 사용합니다.

```
[FEAT] #12 로그인 페이지 구현
```

- 작업 중인 PR은 Draft PR로 생성합니다.
- PR 본문에 `Close #이슈번호`를 작성합니다.
